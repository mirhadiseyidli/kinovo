import { useCallback } from 'react';
import { useAIInsightsQuery } from './useAIInsightsQuery.new';

export const useEventActions = () => {
  const { invalidateInsights } = useAIInsightsQuery({ enabled: false });

  const afterEventAction = useCallback(async (actionType: string) => {
    console.log(`Event action performed: ${actionType} - invalidating AI insights`);
    setTimeout(async () => {
      await invalidateInsights();
    }, 500);
  }, [invalidateInsights]);

  return {
    afterJoinEvent: useCallback(() => afterEventAction('joinEvent'), [afterEventAction]),
    afterCreateEvent: useCallback(() => afterEventAction('createEvent'), [afterEventAction]),
    afterUpdateEvent: useCallback(() => afterEventAction('updateEvent'), [afterEventAction]),
    afterCancelEvent: useCallback(() => afterEventAction('cancelEvent'), [afterEventAction]),
    afterLeaveEvent: useCallback(() => afterEventAction('leaveEvent'), [afterEventAction]),
  };
};