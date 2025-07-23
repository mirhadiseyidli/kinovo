import React from 'react';
import NearbyEventsPageLegacy from './[distance]';
import NearbyEventsPageV2 from './[distance].v2';

/**
 * Migration wrapper for NearbyEvents stack page
 * 
 * This component allows for A/B testing and gradual migration from the legacy
 * usePaginatedNearbyEvents hook to the new TanStack React Query implementation.
 * 
 * Usage:
 * - Set ENABLE_NEARBY_EVENTS_STACK_V2 environment variable to 'true' to use v2
 * - Or pass useV2 prop to force a specific version
 * - Or use the migration feature flag system
 */

interface NearbyEventsPageMigrationProps {
  useV2?: boolean; // Force specific version
}

// Environment-based feature flag (can be overridden by props)
const ENABLE_NEARBY_EVENTS_STACK_V2 = process.env.EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_STACK_V2 === 'true';

const NearbyEventsPageMigration: React.FC<NearbyEventsPageMigrationProps> = ({
  useV2 = ENABLE_NEARBY_EVENTS_STACK_V2
}) => {
  // Log which version is being used for debugging
  React.useEffect(() => {
    if (__DEV__) {
      console.log(`[NearbyEvents Stack Migration] Using ${useV2 ? 'v2 (TanStack Query)' : 'legacy'} version`);
    }
  }, [useV2]);

  if (useV2) {
    return <NearbyEventsPageV2 />;
  }

  return <NearbyEventsPageLegacy />;
};

export default NearbyEventsPageMigration;

/**
 * Migration Rollout Strategy:
 * 
 * Phase 1: Development Testing
 * - Use useV2={true} prop for development testing
 * - Test both versions in parallel during development
 * - Verify infinite scroll and pagination work correctly
 * 
 * Phase 2: Feature Flag Rollout
 * - Set EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_STACK_V2=true in environment
 * - Roll out to small percentage of users
 * - Monitor performance and error rates
 * - Test infinite scroll performance vs pagination
 * 
 * Phase 3: Full Migration
 * - Make v2 the default after successful testing
 * - Remove legacy code after confidence is established
 * - Update routing to use [distance].v2 directly
 * 
 * Environment Variables:
 * - EXPO_PUBLIC_ENABLE_NEARBY_EVENTS_STACK_V2=true # Enable v2 version
 * 
 * Benefits of Migration Wrapper:
 * - Safe rollback capability
 * - A/B testing support
 * - Gradual user migration
 * - Performance comparison between pagination and infinite scroll
 * - Risk mitigation
 */