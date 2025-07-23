import React from 'react';
import NearbyEventsLegacy from './NearbyEvents';
import NearbyEventsV2 from './NearbyEvents.v2';

/**
 * Migration wrapper for NearbyEvents component
 * 
 * This component allows for A/B testing and gradual migration from the legacy
 * useGetNearByEvents hook to the new TanStack React Query implementation.
 * 
 * Usage:
 * - Set ENABLE_NEARBY_EVENTS_V2 environment variable to 'true' to use v2
 * - Or pass useV2 prop to force a specific version
 * - Or use the migration feature flag system
 */

interface NearbyEventsMigrationProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
  useV2?: boolean; // Force specific version
}

// Environment-based feature flag (can be overridden by props)
const ENABLE_NEARBY_EVENTS_V2 = process.env.EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_V2 === 'true';

const NearbyEventsMigration: React.FC<NearbyEventsMigrationProps> = ({
  refreshing,
  onFinishRefresh,
  useV2 = ENABLE_NEARBY_EVENTS_V2
}) => {
  // Log which version is being used for debugging
  React.useEffect(() => {
    if (__DEV__) {
      console.log(`[NearbyEvents Migration] Using ${useV2 ? 'v2 (TanStack Query)' : 'legacy'} version`);
    }
  }, [useV2]);

  if (useV2) {
    return (
      <NearbyEventsV2 
        refreshing={refreshing}
        onFinishRefresh={onFinishRefresh}
      />
    );
  }

  return (
    <NearbyEventsLegacy 
      refreshing={refreshing}
      onFinishRefresh={onFinishRefresh}
    />
  );
};

export default NearbyEventsMigration;

/**
 * Migration Rollout Strategy:
 * 
 * Phase 1: Development Testing
 * - Use useV2={true} prop for development testing
 * - Test both versions in parallel during development
 * - Verify feature parity and performance
 * 
 * Phase 2: Feature Flag Rollout
 * - Set EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_V2=true in environment
 * - Roll out to small percentage of users
 * - Monitor performance and error rates
 * 
 * Phase 3: Full Migration
 * - Make v2 the default after successful testing
 * - Remove legacy code after confidence is established
 * - Update all imports to use NearbyEvents.v2 directly
 * 
 * Environment Variables:
 * - EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_V2=true # Enable v2 version
 * 
 * Benefits of Migration Wrapper:
 * - Safe rollback capability
 * - A/B testing support
 * - Gradual user migration
 * - Performance comparison
 * - Risk mitigation
 */