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
      
      // If user is not a friend, only show public events
      if (!isFriend) {
        return eventData.visibility === 'public';
      }
      
      // If user is a friend, show public and private events
      if (eventData.visibility === 'public' || eventData.visibility === 'private') {
        return true;
      }
      
      // For selected events, only show if current user is an attendee
      if (eventData.visibility === 'selected') {
        const currentUserIsAttendee = eventData.attendees?.some(
          attendee => attendee.user._id === currentUserId
        );
        return currentUserIsAttendee;
      }
      
      return false;
    }).length;
  }, [events, currentUserId, isFriend, isOwnProfile]);

  return eventCount;
}; 