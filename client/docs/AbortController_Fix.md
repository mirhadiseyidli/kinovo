# AbortController Error Fix

## Issue
The UpcomingEvents.v2 component was throwing errors:
```
TypeError: abortControllerRef.current.abort is not a function (it is undefined)
```

## Root Cause
The custom AbortController implementation in `useUpcomingEventsQuery` was flawed:
1. Creating a fake AbortController object: `{ signal } as AbortController`
2. This object didn't have the `.abort()` method
3. Manual abort controller management conflicted with TanStack Query's built-in cancellation

## Solution
Removed the custom AbortController implementation entirely because:

1. **TanStack React Query already handles query cancellation automatically**
   - It creates and manages AbortController internally
   - Provides the `signal` parameter to query functions
   - Automatically cancels requests when components unmount or queries are invalidated

2. **Simplified the code**
   - Removed `abortControllerRef` and all related logic
   - Removed manual cleanup effects
   - Reduced complexity and potential for errors

## Before (Problematic)
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const upcomingEventsQueryFn = useCallback(async ({ signal }) => {
  // Cancel any existing request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort(); // ❌ Error: .abort is not a function
  }
  abortControllerRef.current = signal ? { signal } as AbortController : new AbortController(); // ❌ Fake object
  
  const response = await api.get('/api/events', { 
    signal: signal || abortControllerRef.current?.signal // ❌ Complex logic
  });
  
  return response.data;
}, []);

// Manual cleanup
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // ❌ Error: .abort is not a function
    }
  };
}, []);
```

## After (Fixed)
```typescript
const upcomingEventsQueryFn = useCallback(async ({ signal }) => {
  // TanStack Query provides the signal automatically
  const response = await api.get('/api/events', { signal }); // ✅ Simple and clean
  
  return response.data;
}, []);

// No manual cleanup needed - TanStack Query handles it automatically
```

## Benefits of the Fix

1. **No More Errors**: Eliminated the AbortController method errors
2. **Cleaner Code**: Reduced complexity by 20+ lines
3. **Better Reliability**: Uses TanStack Query's proven cancellation logic  
4. **Automatic Management**: No manual cleanup or error-prone ref management
5. **Standards Compliant**: Follows TanStack Query best practices

## Key Lesson

When using TanStack React Query:
- **Don't implement custom cancellation logic**
- **Trust the built-in signal parameter**  
- **Let TanStack Query handle request lifecycle**
- **Keep query functions simple and focused**

The library is designed to handle all the complex scenarios (race conditions, cleanup, cancellation) automatically.