import { useCallback } from 'react';
import { useAIInsightsQuery } from './useAIInsightsQuery';

/**
 * Hook for handling event-related actions that should invalidate AI insights cache
 * This ensures AI insights reflect the latest user event data
 */
export const useEventActions = () => {
  const { invalidateInsights } = useAIInsightsQuery({ enabled: false }); // Don't fetch, just get invalidation function

  // Function to call after event-related actions
  const afterEventAction = useCallback(async (actionType: string) => {
    console.log(`🔄 Event action performed: ${actionType} - invalidating AI insights cache`);
    
    // Small delay to ensure the server has processed the event change
    setTimeout(async () => {
      await invalidateInsights();
    }, 500);
  }, [invalidateInsights]);

  // Specific action handlers
  const afterJoinEvent = useCallback(() => afterEventAction('joinEvent'), [afterEventAction]);
  const afterCreateEvent = useCallback(() => afterEventAction('createEvent'), [afterEventAction]);
  const afterUpdateEvent = useCallback(() => afterEventAction('updateEvent'), [afterEventAction]);
  const afterCancelEvent = useCallback(() => afterEventAction('cancelEvent'), [afterEventAction]);
  const afterLeaveEvent = useCallback(() => afterEventAction('leaveEvent'), [afterEventAction]);

  return {
    afterJoinEvent,
    afterCreateEvent,
    afterUpdateEvent,
    afterCancelEvent,
    afterLeaveEvent,
    afterEventAction,
  };
};