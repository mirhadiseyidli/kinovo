import { useMemo } from 'react';
import { Event } from '@/types/allTypes';

interface UseEventCountProps {
  events?: {
    event: Event;
    status: 'pending' | 'maybe' | 'accepted' | 'rejected';
  }[];
  currentUserId?: string;
  isFriend: boolean;
  isOwnProfile: boolean;
}

export const useEventCount = (
  events?: UseEventCountProps['events'], 
  currentUserId?: string, 
  isFriend: boolean = false,
  isOwnProfile: boolean = false
): number => {
  const eventCount = useMemo(() => {
    if (!events) return 0;
    
    // If viewing own profile, show all events with accepted or maybe status
    if (isOwnProfile) {
      return events.filter(event => 
        event.status === 'accepted' || event.status === 'maybe'
      ).length;
    }
    
    // For other users, apply visibility filtering
    if (!currentUserId) return 0;
    
    return events.filter(event => {
      // First check: event status must be accepted or maybe
      if (event.status !== 'accepted' && event.status !== 'maybe') {
        return false;
      }

      const eventData = event.event;
      
      // Add null check for eventData
      if (!eventData) {
        return false;
      }
      
      const visibility = eventData.visibility;

      // Add null check for visibility
      if (!visibility) {
        return false;
      }

      // Public events are always visible
      if (visibility === 'public') {
        return true;
      }

      // Private events are visible only to friends
      if (visibility === 'private') {
        return isFriend;
      }

      // Selected events are visible if the current user is on the attendee list
      if (visibility === 'selected') {
        return eventData.attendees?.some(att => att.user._id === currentUserId);
      }

      return false;
    }).length;
  }, [events, currentUserId, isFriend, isOwnProfile]);

  return eventCount;
}; 