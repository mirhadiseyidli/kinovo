'/eventslist/event/get/event/by/id'

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetEventById = (_id: string) => {
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
      // Check if this request is still the active one
      if (activeRequestId.current !== requestId || !isMounted.current) {
        return null;
      }

      const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${_id}`, {
        signal: abortControllerRef.current.signal
      });

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
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch event');
        setLoading(false);
      }
      return null;
    }
  }, [_id]);

  // Auto-fetch when ID changes
  useEffect(() => {
    fetchEventById();
  }, [_id, fetchEventById]);

  return { fetchEventById, event, loading, error };
};