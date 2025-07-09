import { useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useBanner } from '@/context/BannerContext';

export function useInviteContact() {
  const [loading, setLoading] = useState(false);
  const { showBanner } = useBanner();

  const invite = useCallback(async (phone: string) => {
    if (loading) return;
    try {
      setLoading(true);
      const message =
        'Hey! I\'m using Kinovo to discover and plan activities. Join me: https://kinovo.app';
      const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      showBanner('Invitation sent');
    } catch (error) {
      console.error('Failed to send invite:', error);
      showBanner('Could not open SMS');
    } finally {
      setLoading(false);
    }
  }, [loading, showBanner]);

  return { invite, loading };
} 