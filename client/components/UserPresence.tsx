import { useAPNsTokenManager } from '@/hooks/useAPNsTokenManager';
import { useUserPresence } from '@/hooks/useUserPresence';

export function UserPresence() {
  // Initialize APNs token management (replaces FCM)
  useAPNsTokenManager();
  
  // Initialize user presence tracking (replaces Firebase presence)
  useUserPresence();

  return null; // This component only handles side effects
}