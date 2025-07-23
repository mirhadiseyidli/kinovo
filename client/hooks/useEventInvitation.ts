import { useEventMutations } from './useEventMutations';

/**
 * Hook for event invitation actions using TanStack Query mutations
 * 
 * This hook is now a wrapper around useEventMutations to maintain
 * backward compatibility while providing all the benefits of:
 * - Optimistic updates
 * - Offline support
 * - Automatic cache invalidation
 * - Error recovery
 * 
 * @deprecated Use useEventMutations directly for new code
 */
export const useEventInvitation = () => {
  const mutations = useEventMutations();

  return {
    respondToInvitation: mutations.respondToInvitation,
    joinEvent: mutations.joinEvent,
    markNotInterested: mutations.markNotInterested,
    cancelEvent: mutations.cancelEvent,
    removeAttendee: mutations.removeAttendee,
    loading: mutations.loading,
    error: mutations.error ? String(mutations.error) : null,
  };
};