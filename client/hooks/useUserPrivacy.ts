import { useMemo } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useUserData } from '@/hooks/useUserData';

export type ViewerRelationship = 'self' | 'friend' | 'stranger';

/**
 * Hook to check if viewer can see target user's events and determine relationship
 * Replaces useCanViewUserEvents from the old implementation
 */
export const useUserPrivacy = (targetUserId: string) => {
  const { userId: viewerId } = useAuthSession();
  const { user: currentUser } = useUserData();
  
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    
    // Check if users are friends (bidirectional check)
    const areFriends = currentUser?.friends?.includes(targetUserId) || false;
    return areFriends ? 'friend' : 'stranger';
  }, [viewerId, targetUserId, currentUser?.friends]);
  
  return {
    canView: viewerRelationship !== 'stranger' || true, // Allow public events
    relationship: viewerRelationship,
    isOwner: viewerRelationship === 'self',
    isFriend: viewerRelationship === 'friend',
    isStranger: viewerRelationship === 'stranger'
  };
};

// Alias for backward compatibility
export const useCanViewUserEvents = useUserPrivacy;