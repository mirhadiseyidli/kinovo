import React from 'react';
import CategoryPageLegacy from './[category].legacy';
import CategoryPageV2 from './[category]';

/**
 * Migration wrapper for Category stack page
 * 
 * This component allows for A/B testing and gradual migration from the legacy
 * manual state management approach to the new TanStack React Query implementation
 * with InfiniteEventsList.
 * 
 * Usage:
 * - Set ENABLE_CATEGORY_STACK_V2 environment variable to 'true' to use v2
 * - Or pass useV2 prop to force a specific version
 * - Or use the migration feature flag system
 */

interface CategoryPageMigrationProps {
  useV2?: boolean; // Force specific version
}

// Environment-based feature flag (can be overridden by props)
const ENABLE_CATEGORY_STACK_V2 = process.env.EXPO_PUBLIC_ENABLE_CATEGORY_STACK_V2 === 'true';

const CategoryPageMigration: React.FC<CategoryPageMigrationProps> = ({
  useV2 = ENABLE_CATEGORY_STACK_V2
}) => {
  // Log which version is being used for debugging
  React.useEffect(() => {
    if (__DEV__) {
      console.log(`[Category Stack Migration] Using ${useV2 ? 'v2 (TanStack Query + InfiniteEventsList)' : 'legacy'} version`);
    }
  }, [useV2]);

  if (useV2) {
    return <CategoryPageV2 />;
  }

  return <CategoryPageLegacy />;
};

export default CategoryPageMigration;

/**
 * Migration Rollout Strategy:
 * 
 * Phase 1: Development Testing
 * - Use useV2={true} prop for development testing
 * - Test both versions in parallel during development
 * - Verify infinite scroll and pagination work correctly
 * - Test category filtering and event loading
 * 
 * Phase 2: Feature Flag Rollout
 * - Set EXPO_PUBLIC_ENABLE_CATEGORY_STACK_V2=true in environment
 * - Roll out to small percentage of users
 * - Monitor performance and error rates
 * - Test infinite scroll performance vs manual pagination
 * - Verify category-specific functionality
 * 
 * Phase 3: Full Migration
 * - Make v2 the default after successful testing
 * - Remove legacy code after confidence is established
 * - Update routing to use [category].v2 directly
 * 
 * Environment Variables:
 * - EXPO_PUBLIC_ENABLE_CATEGORY_STACK_V2=true # Enable v2 version
 * 
 * Benefits of Migration Wrapper:
 * - Safe rollback capability
 * - A/B testing support
 * - Gradual user migration
 * - Performance comparison between manual state management and TanStack Query
 * - Risk mitigation for category pages
 * - Category-specific testing and validation
 */