import { useState } from 'react';
import api from '@/utils/api';
import { Alert } from 'react-native';
import type { Activity } from '@/constants/Activities';

export const useFavoriteActivities = () => {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/favorite-activities');
      setActivities(response.data.favorite_activities as Activity[]);
      return response.data.favorite_activities;
    } catch (error) {
      console.error('Error fetching favorite activities:', error);
      Alert.alert('Error', 'Failed to fetch favorite activities');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (activity: Activity) => {
    setLoading(true);
    try {
      const response = await api.post('/api/users/favorite-activities', { activity });
      setActivities(response.data.favorite_activities as Activity[]);
      return true;
    } catch (error: any) {
      console.error('Error adding favorite activity:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add activity');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeActivity = async (activity: Activity) => {
    setLoading(true);
    try {
      const response = await api.delete('/api/users/favorite-activities', { 
        data: { activity } 
      });
      setActivities(response.data.favorite_activities as Activity[]);
      return true;
    } catch (error: any) {
      console.error('Error removing favorite activity:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove activity');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    activities,
    fetchActivities,
    addActivity,
    removeActivity
  };
}; 