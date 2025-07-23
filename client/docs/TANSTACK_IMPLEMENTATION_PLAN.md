# TanStack Query Implementation Plan

## Overview
This document outlines the comprehensive enhancement plan for our TanStack Query implementation in the Kinovo events application. Each completed item will be marked with ✅ and includes implementation details.

## Phase 1: Core Fixes & Infrastructure (High Priority)

### 1. Fix deprecated `cacheTime` → `gcTime` and duplicate keys
- [x] Replace `cacheTime` with `gcTime` in `queryClient.ts` and `useUpcomingEventsQuery.ts`
- [x] Fix duplicate `allEventQueries` method in `queryKeys.ts` (renamed to `specificEventQueries`)
- [x] Update all related type definitions

### 2. Set up cache persistence with react-query-persist-client + AsyncStorage
- [x] Install `@tanstack/react-query-persist-client` and `@react-native-async-storage/async-storage`
- [x] Configure persistent cache for instant offline data access
- [x] Set up proper cache hydration on app startup
- [x] Add selective persistence filtering for optimal cache size

### 3. Audit and harden existing Axios interceptors
- [x] Review current interceptors for race conditions and memory leaks
- [x] Add abort controller timeouts for request cancellation
- [x] Implement typed error objects for better error handling
- [x] Add Sentry breadcrumb logging for debugging
- [x] Ensure proper integration with React Query's invalidation
- [x] Add memory leak prevention with periodic cleanup
- [x] Implement retry limits and proper error boundaries

### 4. Use built-in hashQueryKey instead of custom stable query key helper
- [x] Adopt TanStack Query v5's native `hashQueryKey` functionality
- [x] Remove need for custom stable key helpers
- [x] Ensure object parameters are properly hashed to prevent unnecessary re-renders
- [x] Create stable query key utilities for common patterns (location, time, params)
- [x] Add development warnings for unstable query keys
- [x] Update existing query keys to use stable hashing

### 5. Implement offline mutation queue with TanStack Query's persistRetryer pattern
- [x] Set up mutation queue for offline event creation/updates
- [x] Configure automatic retry when connection returns
- [x] Ensure queued mutations survive app restarts
- [x] Handle conflict resolution for offline mutations
- [x] Add priority-based queue processing
- [x] Implement network monitoring and auto-sync
- [x] Create mutation hooks with optimistic updates
- [x] Add offline queue management hooks

## Phase 2: UI/UX Enhancements (Medium Priority)

### 6. Add smooth UI helpers (select, placeholderData, keepPreviousData)
- [x] Implement `select` for data transformation without re-renders
- [x] Use `placeholderData` to show previous results while refetching
- [x] Add `keepPreviousData` to prevent loading flicker during pagination
- [x] Create comprehensive data transformation utilities
- [x] Add placeholder data generators for different scenarios
- [x] Implement smooth UI state indicators and error handling
- [x] Create example hooks demonstrating different patterns
- [x] Add performance optimization for re-render prevention

### 7. Create typed mutation factory with optimistic updates and rollback
- [x] Build `createTypedMutation()` factory with discriminated union types
- [x] Include optimistic update scaffolding
- [x] Add automatic rollback on failure
- [x] Ensure type safety across success/error states
- [x] Create pre-configured mutation factories for common operations
- [x] Add batch operation support with individual error handling
- [x] Implement generic mutation factory for any entity type
- [x] Add comprehensive type guards and utility functions
- [x] Create advanced mutation hooks with validation and state management

### 8. Set up React Query DevTools for development builds
- [x] Conditionally load DevTools in `__DEV__` builds only
- [x] Configure proper DevTools integration for debugging
- [x] Add toggle mechanism for DevTools visibility
- [x] Create comprehensive DevTools manager with persistent settings
- [x] Add query and mutation logging with performance monitoring
- [x] Implement DevTools controller UI with real-time stats
- [x] Add cache inspection and state export functionality
- [x] Create global console commands for debugging
- [x] Add performance monitoring and slow query detection

### 9. Implement global error handling with proper typing
- [x] Create centralized error handling system
- [x] Add proper TypeScript error types
- [x] Implement global error boundary integration
- [x] Add error reporting to telemetry systems

## Phase 3: Advanced Features (Medium Priority)

### 10. Add infinite query patterns for paginated data
- [x] Replace manual pagination with `useInfiniteQuery`
- [x] Implement proper infinite scroll for nearby events
- [x] Add prefetching for better performance
- [x] Handle pagination edge cases

### 11. Create mutation hooks for CRUD operations with optimistic updates
- [x] Build hooks for create, update, delete operations
- [x] Implement optimistic updates for immediate UI feedback
- [x] Add proper cache invalidation strategies
- [x] Handle rollback scenarios gracefully

## Phase 4: Monitoring & Testing (Low Priority)

### 12. Add telemetry hooks for Sentry/New Relic monitoring
- [x] Pipe `onSuccess`/`onError` timings to monitoring systems
- [x] Add payload tracking for debugging
- [x] Implement performance metrics collection
- [x] Add custom telemetry hooks for business metrics

### 13. Create Jest + MSW testing harness with optimistic update examples
- [x] Set up Mock Service Worker for API mocking
- [x] Create test examples for optimistic updates
- [x] Add rollback scenario testing
- [x] Implement integration tests for mutation flows

### 14. Improve cache invalidation strategies with sophisticated patterns
- [x] Add dependency-based invalidation
- [x] Implement tag-based cache invalidation
- [x] Add smart prefetching strategies
- [x] Create cache warming patterns
- [x] Add advanced cache management utilities
- [x] Implement automatic strategy selection with options
- [x] Add batch invalidation operations
- [x] Create cache performance monitoring

## Implementation Order & Dependencies

**Phase 1** must be completed first as it establishes the foundation:
- Items 1-5 can be worked on in parallel after item 1 is complete
- Cache persistence (2) and offline queue (5) work together
- Interceptor audit (3) should be done before other network-related work

**Phase 2** builds on Phase 1:
- UI helpers (6) can be implemented alongside other items
- Mutation factory (7) depends on offline queue from Phase 1
- DevTools (8) and error handling (9) are independent

**Phase 3** requires Phase 1 & 2 completion:
- Infinite queries (10) need stable keys from Phase 1
- Mutation hooks (11) build on mutation factory from Phase 2

**Phase 4** can be implemented throughout:
- Telemetry (12) can be added incrementally
- Testing (13) should be added as features are implemented
- Cache strategies (14) can be improved iteratively

## Notes
- Each checkbox should be marked with ✅ when completed
- Add implementation notes and code snippets as needed
- Update this document as we discover new requirements
- Track any breaking changes or migration steps required

---

*This plan ensures a stable, performant, and maintainable TanStack Query implementation with excellent offline support for the Kinovo mobile events application.*