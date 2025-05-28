'/eventslist/event/get/event/by/id'

import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios, { CancelToken } from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { ApiError, Event } from '@/types/allTypes';

export const useGetEventById = (_id: string) => {
  const { refreshAccessToken } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestId = useRef<string | null>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchEventById = useCallback(async () => {
    if (!_id) return null;

    // Generate a unique request ID
    const requestId = `${_id}-${Date.now()}`;
    activeRequestId.current = requestId;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token available');

      // Check if this request is still the active one
      if (activeRequestId.current !== requestId || !isMounted.current) {
        return null;
      }

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/event/get/event/by/id?_id=${_id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          signal: abortControllerRef.current.signal
        }
      );

      // Check again if this request is still the active one
      if (activeRequestId.current !== requestId || !isMounted.current) {
        return null;
      }

      const fetchedEvent = response.data.found_event;
      if (!fetchedEvent) throw new Error('Event not found');

      if (isMounted.current) {
        setEvent(fetchedEvent);
        setLoading(false);
      }
      return fetchedEvent;

    } catch (error: any) {
      // Don't update state if request was cancelled or component unmounted
      if (axios.isCancel(error) || !isMounted.current || activeRequestId.current !== requestId) {
        return null;
      }

      const err = error as ApiError;
      if (err.response?.status === 401) {
        try {
          await refreshAccessToken();
          const retryToken = await AsyncStorage.getItem('accessToken');
          if (!retryToken) throw new Error('No access token available after refresh');

          // Check again if this request is still valid
          if (activeRequestId.current !== requestId || !isMounted.current) {
            return null;
          }

          const retryResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/event/get/event/by/id?_id=${_id}`,
            { 
              headers: { Authorization: `Bearer ${retryToken}` },
              signal: abortControllerRef.current.signal
            }
          );

          // Final check if this request is still valid
          if (activeRequestId.current !== requestId || !isMounted.current) {
            return null;
          }

          const retryEvent = retryResponse.data.found_event;
          if (!retryEvent) throw new Error('Event not found after token refresh');

          if (isMounted.current) {
            setEvent(retryEvent);
            setLoading(false);
          }
          return retryEvent;

        } catch (retryError: any) {
          if (axios.isCancel(retryError) || !isMounted.current || activeRequestId.current !== requestId) {
            return null;
          }
          if (isMounted.current) {
            setError('Failed to refresh access token');
            setLoading(false);
          }
        }
      } else {
        if (isMounted.current) {
          setError(err.message || 'Failed to fetch event');
          setLoading(false);
        }
      }
      return null;
    }
  }, [_id, refreshAccessToken]);

  // Auto-fetch when ID changes
  useEffect(() => {
    fetchEventById();
  }, [_id, fetchEventById]);

  return { fetchEventById, event, loading, error };
};