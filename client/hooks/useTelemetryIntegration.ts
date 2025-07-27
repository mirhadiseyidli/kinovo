import React, { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { 
  useTelemetry, 
  QueryMetrics, 
  MutationMetrics, 
  BusinessMetrics 
} from './useTelemetryHooks';

/**
 * TanStack Query Telemetry Integration
 * 
 * This module provides automatic telemetry integration for TanStack Query,
 * monitoring all queries and mutations with minimal setup required.
 */

/**
 * Automatic Query Telemetry Hook
 */
export const useQueryTelemetryIntegration = () => {
  const queryClient = useQueryClient();
  const { trackQueryMetrics } = useTelemetry();
  const queryTimers = useRef<Map<string, number>>(new Map());
  
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    // Subscribe to query events
    const queryUnsubscribe = queryCache.subscribe((event) => {
      if (!event.query) return;
      
      const queryKey = JSON.stringify(event.query.queryKey);
      const queryHash = event.query.queryHash;
      
      switch (event.type) {
        case 'added':
          // Query started
          queryTimers.current.set(queryHash, Date.now());
          break;
          
        case 'updated':
          const query = event.query;
          const startTime = queryTimers.current.get(queryHash);
          
          if (startTime && (query.state.status === 'success' || query.state.status === 'error')) {
            const duration = Date.now() - startTime;
            const cacheHit = query.state.dataUpdatedAt > 0 && duration < 50; // Assume cache hit if very fast
            
            const metrics: QueryMetrics = {
              queryKey,
              queryHash,
              duration,
              cacheHit,
              success: query.state.status === 'success',
              error: query.state.error?.message,
              timestamp: Date.now(),
              retryCount: (query.state as any).failureCount || 0, // failureCount exists on QueryState but not typed
              dataSize: query.state.data ? JSON.stringify(query.state.data).length : undefined,
            };
            
            trackQueryMetrics(metrics);
            queryTimers.current.delete(queryHash);
          }
          break;
          
        case 'removed':
          // Clean up timer if query was removed
          queryTimers.current.delete(queryHash);
          break;
      }
    });
    
    // Subscribe to mutation events
    const mutationUnsubscribe = mutationCache.subscribe((event) => {
      if (!event.mutation) return;
      
      const mutationKey = JSON.stringify(event.mutation.options.mutationKey || []);
      const mutationId = event.mutation.mutationId;
      
      if (event.type === 'updated' && event.mutation.state.status !== 'idle') {
        const mutation = event.mutation;
        const startTime = queryTimers.current.get(`mutation_${mutationId}`);
        
        if (mutation.state.status === 'pending' && !startTime) {
          queryTimers.current.set(`mutation_${mutationId}`, Date.now());
        }
        
        if (startTime && (mutation.state.status === 'success' || mutation.state.status === 'error')) {
          const duration = Date.now() - startTime;
          
          // Try to determine mutation type from mutation key or variables
          const mutationType = getMutationType(mutation.options.mutationKey, mutation.state.variables);
          
          const metrics: MutationMetrics = {
            mutationKey,
            mutationType,
            duration,
            success: mutation.state.status === 'success',
            error: mutation.state.error?.message,
            timestamp: Date.now(),
            retryCount: (mutation.state as any).failureCount || 0, // failureCount exists but not typed
            optimisticUpdate: Boolean(mutation.options.onMutate),
            rollbackOccurred: Boolean(mutation.state.error && mutation.options.onError),
          };
          
          // TODO: Add trackMutationMetrics to telemetry hooks
          trackQueryMetrics(metrics as any); // Temporary workaround
          queryTimers.current.delete(`mutation_${mutationId}`);
        }
      }
    });
    
    return () => {
      queryUnsubscribe();
      mutationUnsubscribe();
    };
  }, [queryClient, trackQueryMetrics]);
  
  return {};
};

/**
 * Business Metrics Integration Hook
 */
export const useBusinessMetricsIntegration = () => {
  const { trackBusinessMetrics } = useTelemetry();
  
  const trackUserEngagement = useCallback((action: string, metadata?: any) => {
    trackBusinessMetrics({
      eventType: 'user_engagement',
      action,
      timestamp: Date.now(),
      metadata,
    });
  }, [trackBusinessMetrics]);
  
  const trackFeatureUsage = useCallback((feature: string, metadata?: any) => {
    trackBusinessMetrics({
      eventType: 'feature_usage',
      action: feature,
      timestamp: Date.now(),
      metadata,
    });
  }, [trackBusinessMetrics]);
  
  const trackEventInteraction = useCallback((eventId: string, interaction: string, metadata?: any) => {
    trackBusinessMetrics({
      eventType: 'event_interaction',
      action: interaction,
      timestamp: Date.now(),
      metadata: {
        eventId,
        ...metadata,
      },
    });
  }, [trackBusinessMetrics]);
  
  const trackSearchQuery = useCallback((query: string, results: number, metadata?: any) => {
    trackBusinessMetrics({
      eventType: 'search',
      action: 'query_executed',
      timestamp: Date.now(),
      metadata: {
        query,
        results,
        ...metadata,
      },
    });
  }, [trackBusinessMetrics]);
  
  const trackNavigationEvent = useCallback((from: string, to: string, metadata?: any) => {
    trackBusinessMetrics({
      eventType: 'navigation',
      action: 'screen_change',
      timestamp: Date.now(),
      metadata: {
        from,
        to,
        ...metadata,
      },
    });
  }, [trackBusinessMetrics]);
  
  return {
    trackUserEngagement,
    trackFeatureUsage,
    trackEventInteraction,
    trackSearchQuery,
    trackNavigationEvent,
  };
};

/**
 * Performance Monitoring Integration Hook
 */
export const usePerformanceMonitoringIntegration = () => {
  const { trackPerformanceMetrics } = useTelemetry();
  const performanceMarks = useRef<Map<string, number>>(new Map());
  
  const startPerformanceMeasure = useCallback((name: string) => {
    performanceMarks.current.set(name, Date.now());
    
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}_start`);
    }
  }, []);
  
  const endPerformanceMeasure = useCallback((name: string, metadata?: any) => {
    const startTime = performanceMarks.current.get(name);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${name}_end`);
      performance.measure(name, `${name}_start`, `${name}_end`);
    }
    
    trackPerformanceMetrics({
      metric: name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      context: metadata,
    });
    
    performanceMarks.current.delete(name);
  }, [trackPerformanceMetrics]);
  
  const trackRenderTime = useCallback((componentName: string, renderTime: number) => {
    trackPerformanceMetrics({
      metric: `render_time_${componentName}`,
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
      context: {
        component: componentName,
        type: 'render',
      },
    });
  }, [trackPerformanceMetrics]);
  
  const trackMemoryUsage = useCallback(() => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      
      trackPerformanceMetrics({
        metric: 'memory_usage',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now(),
        context: {
          totalHeapSize: memory.totalJSHeapSize,
          heapSizeLimit: memory.jsHeapSizeLimit,
        },
      });
    }
  }, [trackPerformanceMetrics]);
  
  return {
    startPerformanceMeasure,
    endPerformanceMeasure,
    trackRenderTime,
    trackMemoryUsage,
  };
};

/**
 * Error Tracking Integration Hook
 */
export const useErrorTrackingIntegration = () => {
  const { trackError } = useTelemetry();
  
  const trackQueryError = useCallback((error: Error, queryKey: readonly unknown[], context?: any) => {
    trackError(error, {
      type: 'query_error',
      queryKey: JSON.stringify([...queryKey]), // Convert readonly to mutable for JSON.stringify
      ...context,
    });
  }, [trackError]);
  
  const trackMutationError = useCallback((error: Error, mutationKey: readonly unknown[], context?: any) => {
    trackError(error, {
      type: 'mutation_error',
      mutationKey: JSON.stringify([...mutationKey]), // Convert readonly to mutable for JSON.stringify
      ...context,
    });
  }, [trackError]);
  
  const trackComponentError = useCallback((error: Error, componentName: string, context?: any) => {
    trackError(error, {
      type: 'component_error',
      component: componentName,
      ...context,
    });
  }, [trackError]);
  
  const trackNetworkError = useCallback((error: Error, url: string, method: string, context?: any) => {
    trackError(error, {
      type: 'network_error',
      url,
      method,
      ...context,
    });
  }, [trackError]);
  
  return {
    trackQueryError,
    trackMutationError,
    trackComponentError,
    trackNetworkError,
  };
};

/**
 * Comprehensive Telemetry Integration Hook
 */
export const useTelemetryIntegration = () => {
  const queryTelemetry = useQueryTelemetryIntegration();
  const businessMetrics = useBusinessMetricsIntegration();
  const performanceMonitoring = usePerformanceMonitoringIntegration();
  const errorTracking = useErrorTrackingIntegration();
  
  return {
    ...queryTelemetry,
    ...businessMetrics,
    ...performanceMonitoring,
    ...errorTracking,
  };
};

/**
 * Higher-order component for automatic telemetry
 */
export const withTelemetryIntegration = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: {
    componentName: string;
    trackRender?: boolean;
    trackErrors?: boolean;
    trackInteractions?: boolean;
  }
) => {
  const TelemetryWrappedComponent = React.forwardRef<any, P & { __telemetryHandleInteraction?: (interaction: string) => void }>((props, ref) => {
    const { trackRenderTime, trackComponentError, trackUserEngagement } = useTelemetryIntegration();
    const renderStartTime = useRef<number>(Date.now());
    
    useEffect(() => {
      if (config.trackRender) {
        const renderTime = Date.now() - renderStartTime.current;
        trackRenderTime(config.componentName, renderTime);
      }
    }, [trackRenderTime]);
    
    useEffect(() => {
      if (config.trackErrors && Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
        const errorHandler = (error: ErrorEvent) => {
          trackComponentError(new Error(error.message), config.componentName, {
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
          });
        };
        
        window.addEventListener('error', errorHandler);
        return () => window.removeEventListener('error', errorHandler);
      }
    }, [trackComponentError]);
    
    const handleInteraction = useCallback((interaction: string) => {
      if (config.trackInteractions) {
        trackUserEngagement(`${config.componentName}_${interaction}`);
      }
    }, [trackUserEngagement]);
    
    // Extract the telemetry prop and pass the rest to the wrapped component
    const { __telemetryHandleInteraction, ...componentProps } = props;
    
    return React.createElement(WrappedComponent, {
      ...(componentProps as P),
      __telemetryHandleInteraction: handleInteraction,
      ref: ref,
    });
  });
  
  TelemetryWrappedComponent.displayName = `withTelemetryIntegration(${config.componentName})`;
  
  return TelemetryWrappedComponent;
};

// Helper function to determine mutation type
function getMutationType(mutationKey: readonly unknown[] | undefined, variables: unknown): MutationMetrics['mutationType'] {
  if (!mutationKey && !variables) return 'create';
  
  const keyString = JSON.stringify([...(mutationKey || [])]).toLowerCase();
  const variablesString = JSON.stringify(variables || {}).toLowerCase();
  
  if (keyString.includes('create') || variablesString.includes('create')) return 'create';
  if (keyString.includes('update') || variablesString.includes('update')) return 'update';
  if (keyString.includes('delete') || variablesString.includes('delete')) return 'delete';
  if (keyString.includes('join') || variablesString.includes('join')) return 'join';
  if (keyString.includes('leave') || variablesString.includes('leave')) return 'leave';
  
  return 'create'; // Default
}

export default useTelemetryIntegration;