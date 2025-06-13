import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthSession } from './Auth/AuthProvider';
import { db } from '@/config/firebase';
import {
  ref,
  set,
  update,
  onDisconnect,
  serverTimestamp
} from '@react-native-firebase/database';

export function UserPresence() {
  const { userId } = useAuthSession();

  useEffect(() => {
    if (!userId) return;

    console.log('db', db);

    const userStatusRef = ref(db, `user_status/${userId}`);
    console.log('userStatusRef', userStatusRef);

    const setUserOnline = async () => {
      try {
        await set(userStatusRef, {
          online: true,
          lastActive: serverTimestamp(),
        });

        // Setup onDisconnect behavior
        onDisconnect(userStatusRef).update({
          online: false,
          lastActive: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setUserOnline();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        update(userStatusRef, {
          online: false,
          lastActive: serverTimestamp(),
        });
      }
    };

    setUserOnline();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      update(userStatusRef, {
        online: false,
        lastActive: serverTimestamp(),
      });
    };
  }, [userId]);

  return null;
}