import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';

/**
 * Telemetry Hooks for TanStack Query Monitoring
 * 
 * This module provides comprehensive telemetry hooks for monitoring:
 * - Query performance metrics (timing, cache hits, errors)
 * - Mutation success/failure rates and timings
 * - Business metrics (user engagement, feature usage)
 * - Application performance indicators
 * - Integration with Sentry, New Relic, and custom analytics
 */

// Telemetry interfaces
export interface QueryMetrics {
  queryKey: string;
  queryHash: string;
  duration: number;
  cacheHit: boolean;
  success: boolean;
  error?: string;
  timestamp: number;
  userId?: string;
  retryCount: number;
  dataSize?: number;
}

export interface MutationMetrics {
  mutationKey: string;
  mutationType: 'create' | 'update' | 'delete' | 'join' | 'leave';
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
  userId?: string;
  retryCount: number;
  optimisticUpdate: boolean;
  rollbackOccurred: boolean;
}

export interface BusinessMetrics {
  eventType: string;
  action: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  sessionId?: string;
  userAgent?: string;
  platform?: string;
}

export interface PerformanceMetrics {
  metric: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: Record<string, any>;
}

// Telemetry providers interface
export interface TelemetryProviders {
  sentry?: {
    captureException: (error: Error, context?: any) => void;
    captureMessage: (message: string, level?: string) => void;
    addBreadcrumb: (breadcrumb: any) => void;
    setTag: (key: string, value: string) => void;
    setUser: (user: any) => void;
    setContext: (name: string, context: any) => void;
  };
  newRelic?: {
    addPageAction: (name: string, attributes?: any) => void;
    setCustomAttribute: (name: string, value: string | number) => void;
    recordMetric: (name: string, value: number) => void;
    noticeError: (error: Error, attributes?: any) => void;
  };
  analytics?: {
    track: (event: string, properties?: any) => void;
    identify: (userId: string, traits?: any) => void;
    page: (category?: string, name?: string, properties?: any) => void;
  };
  customLogger?: {
    log: (level: string, message: string, metadata?: any) => void;
    metric: (name: string, value: number, tags?: any) => void;
    event: (name: string, properties?: any) => void;
  };
}

// Global telemetry configuration
let telemetryProviders: TelemetryProviders = {};
let telemetryEnabled = true;
let sessionId: string = '';

/**
 * Initialize telemetry providers
 */
export const initializeTelemetry = (providers: TelemetryProviders) => {
  telemetryProviders = providers;
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set up global error handlers
  if (providers.sentry) {
    providers.sentry.setTag('component', 'tanstack-query');
    providers.sentry.setContext('telemetry', {
      sessionId,
      timestamp: Date.now(),
      version: '1.0.0',
    });
  }
  
  console.log('📊 Telemetry initialized with session ID:', sessionId);
};

/**
 * Enable or disable telemetry
 */
export const setTelemetryEnabled = (enabled: boolean) => {
  telemetryEnabled = enabled;
  console.log(`📊 Telemetry ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Query Performance Telemetry Hook
 */
export const useQueryTelemetry = () => {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : undefined;
  
  const trackQueryMetrics = useCallback((metrics: QueryMetrics) => {
    if (!telemetryEnabled) return;
    
    const enhancedMetrics = {
      ...metrics,
      userId,
      sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    };
    
    // Send to Sentry
    if (telemetryProviders.sentry) {
      telemetryProviders.sentry.addBreadcrumb({
        category: 'query',
        message: `Query ${metrics.success ? 'success' : 'failure'}: ${metrics.queryKey}`,
        level: metrics.success ? 'info' : 'error',
        data: enhancedMetrics,
      });
      
      if (!metrics.success && metrics.error) {
        telemetryProviders.sentry.captureException(new Error(metrics.error), {
          tags: {
            queryKey: metrics.queryKey,
            queryHash: metrics.queryHash,
            retryCount: metrics.retryCount.toString(),
          },
          extra: enhancedMetrics,
        });
      }
    }
    
    // Send to New Relic
    if (telemetryProviders.newRelic) {
      telemetryProviders.newRelic.recordMetric('Custom/Query/Duration', metrics.duration);
      telemetryProviders.newRelic.recordMetric('Custom/Query/CacheHitRate', metrics.cacheHit ? 1 : 0);
      
      if (metrics.dataSize) {
        telemetryProviders.newRelic.recordMetric('Custom/Query/DataSize', metrics.dataSize);
      }
      
      telemetryProviders.newRelic.addPageAction('queryExecution', {
        queryKey: metrics.queryKey,
        duration: metrics.duration,
        success: metrics.success,
        cacheHit: metrics.cacheHit,
        retryCount: metrics.retryCount,
      });
      
      if (!metrics.success && metrics.error) {
        telemetryProviders.newRelic.noticeError(new Error(metrics.error), {
          queryKey: metrics.queryKey,
          queryHash: metrics.queryHash,
          retryCount: metrics.retryCount,
        });
      }
    }
    
    // Send to analytics
    if (telemetryProviders.analytics) {
      telemetryProviders.analytics.track('Query Executed', {
        queryKey: metrics.queryKey,
        duration: metrics.duration,
        success: metrics.success,
        cacheHit: metrics.cacheHit,
        retryCount: metrics.retryCount,
        userId,
        sessionId,
      });
    }
    
    // Send to custom logger
    if (telemetryProviders.customLogger) {
      telemetryProviders.customLogger.metric('query.duration', metrics.duration, {
        queryKey: metrics.queryKey,
        success: metrics.success,
        cacheHit: metrics.cacheHit,
      });
      
      telemetryProviders.customLogger.event('query.executed', enhancedMetrics);
    }
  }, [userId]);
  
  return { trackQueryMetrics };
};

/**
 * Mutation Performance Telemetry Hook
 */
export const useMutationTelemetry = () => {
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : undefined;
  
  const trackMutationMetrics = useCallback((metrics: MutationMetrics) => {
    if (!telemetryEnabled) return;
    
    const enhancedMetrics = {
      ...metrics,
      userId,
      sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    };
    
    // Send to Sentry
    if (telemetryProviders.sentry) {
      telemetryProviders.sentry.addBreadcrumb({
        category: 'mutation',
        message: `Mutation ${metrics.success ? 'success' : 'failure'}: ${metrics.mutationType}`,
        level: metrics.success ? 'info' : 'error',
        data: enhancedMetrics,
      });
      
      if (!metrics.success && metrics.error) {
        telemetryProviders.sentry.captureException(new Error(metrics.error), {
          tags: {
            mutationKey: metrics.mutationKey,
            mutationType: metrics.mutationType,
            optimisticUpdate: metrics.optimisticUpdate.toString(),
            rollbackOccurred: metrics.rollbackOccurred.toString(),
          },
          extra: enhancedMetrics,
        });
      }
    }
    
    // Send to New Relic
    if (telemetryProviders.newRelic) {
      telemetryProviders.newRelic.recordMetric('Custom/Mutation/Duration', metrics.duration);
      telemetryProviders.newRelic.recordMetric('Custom/Mutation/SuccessRate', metrics.success ? 1 : 0);
      telemetryProviders.newRelic.recordMetric('Custom/Mutation/OptimisticUpdateRate', metrics.optimisticUpdate ? 1 : 0);
      telemetryProviders.newRelic.recordMetric('Custom/Mutation/RollbackRate', metrics.rollbackOccurred ? 1 : 0);
      
      telemetryProviders.newRelic.addPageAction('mutationExecution', {
        mutationKey: metrics.mutationKey,
        mutationType: metrics.mutationType,
        duration: metrics.duration,
        success: metrics.success,
        optimisticUpdate: metrics.optimisticUpdate,
        rollbackOccurred: metrics.rollbackOccurred,
      });
      
      if (!metrics.success && metrics.error) {
        telemetryProviders.newRelic.noticeError(new Error(metrics.error), {
          mutationKey: metrics.mutationKey,
          mutationType: metrics.mutationType,
          optimisticUpdate: metrics.optimisticUpdate,
          rollbackOccurred: metrics.rollbackOccurred,
        });
      }
    }
    
    // Send to analytics
    if (telemetryProviders.analytics) {
      telemetryProviders.analytics.track('Mutation Executed', {
        mutationKey: metrics.mutationKey,
        mutationType: metrics.mutationType,
        duration: metrics.duration,
        success: metrics.success,
        optimisticUpdate: metrics.optimisticUpdate,
        rollbackOccurred: metrics.rollbackOccurred,
        userId,
        sessionId,
      });
    }
    
    // Send to custom logger
    if (telemetryProviders.customLogger) {
      telemetryProviders.customLogger.metric('mutation.duration', metrics.duration, {
        mutationKey: metrics.mutationKey,
        mutationType: metrics.mutationType,
        success: metrics.success,
      });
      
      telemetryProviders.customLogger.event('mutation.executed', enhancedMetrics);
    }
  }, [userId]);
  
  return { trackMutationMetrics };
};

/**
 * Business Metrics Telemetry Hook
 */
export const useBusinessTelemetry = () => {
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : undefined;
  
  const trackBusinessMetrics = useCallback((metrics: BusinessMetrics) => {
    if (!telemetryEnabled) return;
    
    const enhancedMetrics = {
      ...metrics,
      userId: metrics.userId || userId,
      sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    };
    
    // Send to Sentry
    if (telemetryProviders.sentry) {
      telemetryProviders.sentry.addBreadcrumb({
        category: 'business',
        message: `Business event: ${metrics.eventType} - ${metrics.action}`,
        level: 'info',
        data: enhancedMetrics,
      });
    }
    
    // Send to New Relic
    if (telemetryProviders.newRelic) {
      telemetryProviders.newRelic.addPageAction('businessEvent', {
        eventType: metrics.eventType,
        action: metrics.action,
        userId: enhancedMetrics.userId,
        sessionId,
        metadata: metrics.metadata,
      });
    }
    
    // Send to analytics
    if (telemetryProviders.analytics) {
      telemetryProviders.analytics.track(`${metrics.eventType} - ${metrics.action}`, {
        eventType: metrics.eventType,
        action: metrics.action,
        userId: enhancedMetrics.userId,
        sessionId,
        metadata: metrics.metadata,
      });
    }
    
    // Send to custom logger
    if (telemetryProviders.customLogger) {
      telemetryProviders.customLogger.event('business.event', enhancedMetrics);
    }
  }, [userId]);
  
  return { trackBusinessMetrics };
};

/**
 * Performance Monitoring Hook
 */
export const usePerformanceTelemetry = () => {
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  
  const trackPerformanceMetrics = useCallback((metrics: PerformanceMetrics) => {
    if (!telemetryEnabled) return;
    
    const enhancedMetrics = {
      ...metrics,
      sessionId,
      timestamp: Date.now(),
    };
    
    // Send to Sentry
    if (telemetryProviders.sentry) {
      telemetryProviders.sentry.addBreadcrumb({
        category: 'performance',
        message: `Performance metric: ${metrics.metric} = ${metrics.value}${metrics.unit}`,
        level: 'info',
        data: enhancedMetrics,
      });
    }
    
    // Send to New Relic
    if (telemetryProviders.newRelic) {
      telemetryProviders.newRelic.recordMetric(`Custom/Performance/${metrics.metric}`, metrics.value);
      telemetryProviders.newRelic.addPageAction('performanceMetric', {
        metric: metrics.metric,
        value: metrics.value,
        unit: metrics.unit,
        context: metrics.context,
      });
    }
    
    // Send to analytics
    if (telemetryProviders.analytics) {
      telemetryProviders.analytics.track('Performance Metric', {
        metric: metrics.metric,
        value: metrics.value,
        unit: metrics.unit,
        context: metrics.context,
        sessionId,
      });
    }
    
    // Send to custom logger
    if (telemetryProviders.customLogger) {
      telemetryProviders.customLogger.metric(`performance.${metrics.metric}`, metrics.value, {
        unit: metrics.unit,
        context: metrics.context,
      });
    }
  }, []);
  
  const startPerformanceMonitoring = useCallback(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;
    
    try {
      performanceObserver.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            trackPerformanceMetrics({
              metric: entry.name,
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              context: {
                startTime: entry.startTime,
                duration: entry.duration,
              },
            });
          }
        }
      });
      
      performanceObserver.current.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }, [trackPerformanceMetrics]);
  
  const stopPerformanceMonitoring = useCallback(() => {
    if (performanceObserver.current) {
      performanceObserver.current.disconnect();
      performanceObserver.current = null;
    }
  }, []);
  
  useEffect(() => {
    startPerformanceMonitoring();
    return stopPerformanceMonitoring;
  }, [startPerformanceMonitoring, stopPerformanceMonitoring]);
  
  return { 
    trackPerformanceMetrics,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
  };
};

/**
 * Comprehensive Telemetry Hook
 */
export const useTelemetry = () => {
  const queryTelemetry = useQueryTelemetry();
  const mutationTelemetry = useMutationTelemetry();
  const businessTelemetry = useBusinessTelemetry();
  const performanceTelemetry = usePerformanceTelemetry();
  
  const trackEvent = useCallback((event: string, properties?: any) => {
    businessTelemetry.trackBusinessMetrics({
      eventType: 'user_interaction',
      action: event,
      timestamp: Date.now(),
      metadata: properties,
    });
  }, [businessTelemetry]);
  
  const trackError = useCallback((error: Error, context?: any) => {
    if (telemetryProviders.sentry) {
      telemetryProviders.sentry.captureException(error, {
        tags: {
          component: 'tanstack-query',
          sessionId,
        },
        extra: context,
      });
    }
    
    if (telemetryProviders.newRelic) {
      telemetryProviders.newRelic.noticeError(error, {
        component: 'tanstack-query',
        sessionId,
        ...context,
      });
    }
  }, []);
  
  const trackTiming = useCallback((name: string, duration: number, context?: any) => {
    performanceTelemetry.trackPerformanceMetrics({
      metric: name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      context,
    });
  }, [performanceTelemetry]);
  
  return {
    // Individual telemetry hooks
    ...queryTelemetry,
    ...mutationTelemetry,
    ...businessTelemetry,
    ...performanceTelemetry,
    
    // Convenience methods
    trackEvent,
    trackError,
    trackTiming,
    
    // Configuration
    setEnabled: setTelemetryEnabled,
    sessionId,
  };
};

/**
 * Higher-order hook for automatic telemetry
 */
export const withTelemetry = <T extends any[], R>(
  hookFn: (...args: T) => R,
  telemetryConfig: {
    name: string;
    category: 'query' | 'mutation' | 'business' | 'performance';
    trackTiming?: boolean;
    trackSuccess?: boolean;
    trackError?: boolean;
  }
) => {
  return (...args: T): R => {
    const telemetry = useTelemetry();
    const startTime = useRef<number>(Date.now());
    
    useEffect(() => {
      startTime.current = Date.now();
      
      if (telemetryConfig.trackTiming) {
        telemetry.trackTiming(`${telemetryConfig.name}.start`, 0);
      }
    }, []);
    
    const result = hookFn(...args);
    
    useEffect(() => {
      if (telemetryConfig.trackTiming) {
        const duration = Date.now() - startTime.current;
        telemetry.trackTiming(`${telemetryConfig.name}.duration`, duration);
      }
      
      if (telemetryConfig.trackSuccess) {
        telemetry.trackEvent(`${telemetryConfig.name}.success`);
      }
    }, [result]);
    
    return result;
  };
};

// Export telemetry configuration
export { telemetryProviders };

// Development helpers
if (__DEV__) {
  (global as any).__TELEMETRY_SYSTEM__ = {
    providers: telemetryProviders,
    sessionId,
    enabled: telemetryEnabled,
    initialize: initializeTelemetry,
    setEnabled: setTelemetryEnabled,
    
    // Test helpers
    mockProviders: {
      sentry: {
        captureException: console.error,
        captureMessage: console.log,
        addBreadcrumb: console.log,
        setTag: console.log,
        setUser: console.log,
        setContext: console.log,
      },
      newRelic: {
        addPageAction: console.log,
        setCustomAttribute: console.log,
        recordMetric: console.log,
        noticeError: console.error,
      },
      analytics: {
        track: console.log,
        identify: console.log,
        page: console.log,
      },
      customLogger: {
        log: console.log,
        metric: console.log,
        event: console.log,
      },
    },
  };
}