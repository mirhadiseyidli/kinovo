import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { 
  initializeTelemetry, 
  setTelemetryEnabled, 
  TelemetryProviders 
} from '@/hooks/useTelemetryHooks';

/**
 * Telemetry Setup and Configuration
 * 
 * This module provides setup utilities for integrating telemetry
 * with real monitoring services in production environments.
 */

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sentry Configuration
 */
const setupSentryProvider = (): TelemetryProviders['sentry'] | undefined => {
  // Check if Sentry is available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    
    return {
      captureException: (error: Error, context?: any) => {
        Sentry.captureException(error, {
          tags: {
            source: 'tanstack-query',
            ...context?.tags,
          },
          extra: {
            timestamp: Date.now(),
            ...context?.extra,
          },
          user: context?.user,
          fingerprint: context?.fingerprint,
        });
      },
      
      captureMessage: (message: string, level: string = 'info') => {
        Sentry.captureMessage(message, level as any);
      },
      
      addBreadcrumb: (breadcrumb: any) => {
        Sentry.addBreadcrumb({
          timestamp: Date.now() / 1000,
          category: 'tanstack-query',
          ...breadcrumb,
        });
      },
      
      setTag: (key: string, value: string) => {
        Sentry.setTag(key, value);
      },
      
      setUser: (user: any) => {
        Sentry.setUser(user);
      },
      
      setContext: (name: string, context: any) => {
        Sentry.setContext(name, context);
      },
    };
  }
  
  return undefined;
};

/**
 * New Relic Configuration
 */
const setupNewRelicProvider = (): TelemetryProviders['newRelic'] | undefined => {
  // Check if New Relic is available
  if (typeof window !== 'undefined' && (window as any).newrelic) {
    const newrelic = (window as any).newrelic;
    
    return {
      addPageAction: (name: string, attributes?: any) => {
        newrelic.addPageAction(name, {
          timestamp: Date.now(),
          source: 'tanstack-query',
          ...attributes,
        });
      },
      
      setCustomAttribute: (name: string, value: string | number) => {
        newrelic.setCustomAttribute(name, value);
      },
      
      recordMetric: (name: string, value: number) => {
        newrelic.recordMetric(name, value);
      },
      
      noticeError: (error: Error, attributes?: any) => {
        newrelic.noticeError(error, {
          timestamp: Date.now(),
          source: 'tanstack-query',
          ...attributes,
        });
      },
    };
  }
  
  return undefined;
};

/**
 * Analytics Configuration (e.g., Segment, Mixpanel)
 */
const setupAnalyticsProvider = (): TelemetryProviders['analytics'] | undefined => {
  // Check if analytics is available (e.g., Segment)
  if (typeof window !== 'undefined' && (window as any).analytics) {
    const analytics = (window as any).analytics;
    
    return {
      track: (event: string, properties?: any) => {
        analytics.track(event, {
          timestamp: new Date().toISOString(),
          source: 'tanstack-query',
          ...properties,
        });
      },
      
      identify: (userId: string, traits?: any) => {
        analytics.identify(userId, {
          timestamp: new Date().toISOString(),
          source: 'tanstack-query',
          ...traits,
        });
      },
      
      page: (category?: string, name?: string, properties?: any) => {
        analytics.page(category, name, {
          timestamp: new Date().toISOString(),
          source: 'tanstack-query',
          ...properties,
        });
      },
    };
  }
  
  return undefined;
};

/**
 * Custom Logger Configuration
 */
const setupCustomLoggerProvider = (): TelemetryProviders['customLogger'] | undefined => {
  // Only enable detailed logging in development
  if (isDevelopment) {
    return {
      log: (level: string, message: string, metadata?: any) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        
        if (metadata) {
          console.log(logMessage, metadata);
        } else {
          console.log(logMessage);
        }
      },
      
      metric: (name: string, value: number, tags?: any) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] METRIC: ${name} = ${value}`, tags);
      },
      
      event: (name: string, properties?: any) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] EVENT: ${name}`, properties);
      },
    };
  }
  
  return undefined;
};

/**
 * Setup Telemetry Providers
 */
export const setupTelemetryProviders = (): TelemetryProviders => {
  const providers: TelemetryProviders = {};
  
  // Setup Sentry
  const sentryProvider = setupSentryProvider();
  if (sentryProvider) {
    providers.sentry = sentryProvider;
    console.log('📊 Sentry telemetry provider initialized');
  }
  
  // Setup New Relic
  const newRelicProvider = setupNewRelicProvider();
  if (newRelicProvider) {
    providers.newRelic = newRelicProvider;
    console.log('📊 New Relic telemetry provider initialized');
  }
  
  // Setup Analytics
  const analyticsProvider = setupAnalyticsProvider();
  if (analyticsProvider) {
    providers.analytics = analyticsProvider;
    console.log('📊 Analytics telemetry provider initialized');
  }
  
  // Setup Custom Logger
  const customLoggerProvider = setupCustomLoggerProvider();
  if (customLoggerProvider) {
    providers.customLogger = customLoggerProvider;
    console.log('📊 Custom Logger telemetry provider initialized');
  }
  
  return providers;
};

/**
 * Initialize Telemetry for the Application
 * Currently configured for development environment only
 */
export const initializeAppTelemetry = (queryClient: QueryClient) => {
  // Only initialize telemetry in development
  if (!__DEV__) {
    console.log('📊 Telemetry disabled in production build');
    return;
  }
  
  try {
    // Setup providers
    const providers = setupTelemetryProviders();
    
    // Initialize telemetry
    initializeTelemetry(providers);
    
    // Enable telemetry for development
    setTelemetryEnabled(true);
    
    // Set up global error handlers (only for web platform)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('error', (event) => {
        if (providers.sentry) {
          providers.sentry.captureException(event.error, {
            tags: { source: 'window-error' },
            extra: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          });
        }
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        if (providers.sentry) {
          providers.sentry.captureException(event.reason, {
            tags: { source: 'unhandled-promise-rejection' },
          });
        }
      });
    }
    
    // Set up React Query default options (without deprecated callbacks)
    queryClient.setDefaultOptions({
      queries: {
        // Default query options without onError callback
        retry: (failureCount, error) => {
          // Log errors for telemetry before retry logic
          if (providers.sentry) {
            providers.sentry.captureException(error as Error, {
              tags: {
                source: 'react-query-error',
                queryType: 'query',
                failureCount: failureCount.toString(),
              },
              extra: {
                willRetry: failureCount < 3,
                timestamp: Date.now(),
              },
            });
          }
          
          // Standard retry logic
          return failureCount < 3 && !((error as any)?.status >= 400);
        },
      },
      mutations: {
        // Default mutation options without onError callback
        retry: (failureCount, error) => {
          // Log errors for telemetry before retry logic
          if (providers.sentry) {
            providers.sentry.captureException(error as Error, {
              tags: {
                source: 'react-query-error',
                queryType: 'mutation',
                failureCount: failureCount.toString(),
              },
              extra: {
                willRetry: failureCount < 1,
                timestamp: Date.now(),
              },
            });
          }
          
          // Standard retry logic for mutations (typically less aggressive)
          return failureCount < 1 && !((error as any)?.status >= 400);
        },
      },
    });
    
    // Alternative: Set up a global cache event listener for errors
    // This is the recommended approach in React Query v5
    queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation.state.status === 'error') {
        if (providers.sentry) {
          providers.sentry.captureException(event.mutation.state.error as Error, {
            tags: {
              source: 'react-query-mutation-error',
              mutationKey: event.mutation.options.mutationKey?.[0] || 'unknown',
            },
            extra: {
              mutationId: event.mutation.mutationId,
              variables: event.mutation.state.variables,
              timestamp: Date.now(),
            },
          });
        }
      }
    });
    
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        if (providers.sentry) {
          providers.sentry.captureException(event.query.state.error as Error, {
            tags: {
              source: 'react-query-query-error',
              queryKey: event.query.queryKey[0] || 'unknown',
            },
            extra: {
              queryKey: event.query.queryKey,
              queryHash: event.query.queryHash,
              timestamp: Date.now(),
            },
          });
        }
      }
    });
    
    console.log('📊 Application telemetry initialized successfully (development only)');
    
  } catch (error) {
    console.error('❌ Failed to initialize application telemetry (development):', error);
  }
};

/**
 * Telemetry Configuration Options
 */
export interface TelemetryConfig {
  enabled: boolean;
  providers: {
    sentry: boolean;
    newRelic: boolean;
    analytics: boolean;
    customLogger: boolean;
  };
  sampling: {
    queries: number; // 0-1, percentage of queries to track
    mutations: number; // 0-1, percentage of mutations to track
    errors: number; // 0-1, percentage of errors to track
  };
  privacy: {
    excludeUserData: boolean;
    excludeQueryData: boolean;
    excludeVariables: boolean;
  };
}

/**
 * Default Telemetry Configuration
 * Currently configured for development environment only
 */
export const defaultTelemetryConfig: TelemetryConfig = {
  enabled: isDevelopment, // Only enabled in development
  providers: {
    sentry: false, // Disabled for now
    newRelic: false, // Disabled for now
    analytics: false, // Disabled for now
    customLogger: isDevelopment, // Only console logging in dev
  },
  sampling: {
    queries: isDevelopment ? 1.0 : 0, // 100% in development, 0% in production
    mutations: isDevelopment ? 1.0 : 0, // 100% in development, 0% in production
    errors: isDevelopment ? 1.0 : 0, // Only track errors in development
  },
  privacy: {
    excludeUserData: false,
    excludeQueryData: false, // Show all data in development
    excludeVariables: false, // Show all variables in development
  },
};

/**
 * Configure Telemetry with Custom Options
 */
export const configureTelemetry = (config: Partial<TelemetryConfig>) => {
  const finalConfig = { ...defaultTelemetryConfig, ...config };
  
  // Apply configuration
  setTelemetryEnabled(finalConfig.enabled);
  
  console.log('📊 Telemetry configured:', finalConfig);
  
  return finalConfig;
};

/**
 * Environment-specific Telemetry Setup
 * Currently only development environment is supported
 */
export const setupTelemetryForEnvironment = (environment: 'development' | 'staging' | 'production') => {
  switch (environment) {
    case 'development':
      return configureTelemetry({
        enabled: true,
        providers: {
          sentry: false,
          newRelic: false,
          analytics: false,
          customLogger: true,
        },
        sampling: {
          queries: 1.0,
          mutations: 1.0,
          errors: 1.0,
        },
        privacy: {
          excludeUserData: false,
          excludeQueryData: false,
          excludeVariables: false,
        },
      });
      
    case 'staging':
    case 'production':
      // Telemetry disabled for staging and production
      return configureTelemetry({
        enabled: false,
        providers: {
          sentry: false,
          newRelic: false,
          analytics: false,
          customLogger: false,
        },
        sampling: {
          queries: 0,
          mutations: 0,
          errors: 0,
        },
        privacy: {
          excludeUserData: true,
          excludeQueryData: true,
          excludeVariables: true,
        },
      });
      
    default:
      return defaultTelemetryConfig;
  }
};

// Export for easy access
export {
  setupSentryProvider,
  setupNewRelicProvider,
  setupAnalyticsProvider,
  setupCustomLoggerProvider,
};

// Development helpers
if (__DEV__) {
  (global as any).__TELEMETRY_SETUP__ = {
    setupProviders: setupTelemetryProviders,
    initializeApp: initializeAppTelemetry,
    configure: configureTelemetry,
    setupForEnvironment: setupTelemetryForEnvironment,
    defaultConfig: defaultTelemetryConfig,
  };
}