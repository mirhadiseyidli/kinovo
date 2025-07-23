import React from 'react';
import CategoryPageLegacy from './CategoryPage';
import CategoryPageV2 from './CategoryPage.v2';

/**
 * Migration wrapper for CategoryPage component
 * 
 * This component allows for A/B testing and gradual migration from the legacy
 * manual state management with ScrollView to the new TanStack React Query 
 * implementation with InfiniteEventsList.
 * 
 * Usage:
 * - Set ENABLE_CATEGORY_PAGE_V2 environment variable to 'true' to use v2
 * - Or pass useV2 prop to force a specific version
 * - Or use the migration feature flag system
 */

interface CategoryPageMigrationProps {
  useV2?: boolean; // Force specific version
}

// Environment-based feature flag (can be overridden by props)
const ENABLE_CATEGORY_PAGE_V2 = process.env.EXPO_PUBLIC_ENABLE_CATEGORY_PAGE_V2 === 'true';

const CategoryPageMigration: React.FC<CategoryPageMigrationProps> = ({
  useV2 = ENABLE_CATEGORY_PAGE_V2
}) => {
  // Log which version is being used for debugging
  React.useEffect(() => {
    if (__DEV__) {
      console.log(`[CategoryPage Migration] Using ${useV2 ? 'v2 (TanStack Query + InfiniteEventsList)' : 'legacy'} version`);
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
 * - Verify infinite scroll functionality
 * - Test category header card and section behavior
 * - Validate event loading and error handling
 * 
 * Phase 2: Feature Flag Rollout
 * - Set EXPO_PUBLIC_ENABLE_CATEGORY_PAGE_V2=true in environment
 * - Roll out to small percentage of users
 * - Monitor performance and error rates
 * - Test infinite scroll vs manual ScrollView performance
 * - Verify category-specific functionality and navigation
 * 
 * Phase 3: Full Migration
 * - Make v2 the default after successful testing
 * - Remove legacy code after confidence is established
 * - Update all imports to use CategoryPage.v2 directly
 * 
 * Environment Variables:
 * - EXPO_PUBLIC_ENABLE_CATEGORY_PAGE_V2=true # Enable v2 version
 * 
 * Benefits of Migration Wrapper:
 * - Safe rollback capability
 * - A/B testing support
 * - Gradual user migration
 * - Performance comparison between ScrollView and InfiniteEventsList
 * - Risk mitigation for category page functionality
 * - Component-level testing and validation
 */