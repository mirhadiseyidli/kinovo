import { QueryClient } from '@tanstack/react-query';
import { TypedAxiosError } from './api';

/**
 * Global Error Handling System for TanStack Query
 * 
 * This module provides centralized error handling with proper TypeScript typing,
 * integration with React Query, and support for different error types.
 */

// Base error interface
export interface BaseError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  handled: boolean;
  retryable: boolean;
}

// Query-specific error
export interface QueryError extends BaseError {
  type: 'query';
  queryKey: unknown[];
  queryHash: string;
  fetchStatus: 'idle' | 'fetching' | 'paused';
  failureCount: number;
  isNetworkError: boolean;
  isTimeoutError: boolean;
}

// Mutation-specific error
export interface MutationError extends BaseError {
  type: 'mutation';
  mutationKey?: string[];
  mutationId: number;
  variables: unknown;
  failureCount: number;
  canRollback: boolean;
}

// Application-specific error
export interface AppError extends BaseError {
  type: 'app';
  component?: string;
  props?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

// Network-specific error
export interface NetworkErrorExtended extends BaseError {
  type: 'network';
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  isOffline: boolean;
  isTimeout: boolean;
}

// Discriminated union of all error types
export type GlobalError = QueryError | MutationError | AppError | NetworkErrorExtended;

// Error handler function type
export type ErrorHandler = (error: GlobalError) => void | Promise<void>;

// Error recovery strategy
export interface ErrorRecoveryStrategy {
  canRecover: (error: GlobalError) => boolean;
  recover: (error: GlobalError) => Promise<void>;
  description: string;
}

// Global error state
class ErrorHandlingSystem {
  private errors: Map<string, GlobalError> = new Map();
  private handlers: Map<string, ErrorHandler> = new Map();
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private maxErrors = 100;
  private telemetryEnabled = true;

  // Register error handler
  public registerHandler(key: string, handler: ErrorHandler): void {
    this.handlers.set(key, handler);
  }

  // Unregister error handler
  public unregisterHandler(key: string): void {
    this.handlers.delete(key);
  }

  // Add recovery strategy
  public addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  // Handle error
  public async handleError(error: GlobalError): Promise<void> {
    // Store error
    this.errors.set(error.id, error);
    
    // Limit stored errors
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      if (oldestKey) {
        this.errors.delete(oldestKey);
      }
    }

    // Log error
    this.logError(error);

    // Attempt recovery
    await this.attemptRecovery(error);

    // Notify handlers
    for (const handler of this.handlers.values()) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    // Send telemetry if enabled
    if (this.telemetryEnabled) {
      this.sendTelemetry(error);
    }
  }

  // Attempt error recovery
  private async attemptRecovery(error: GlobalError): Promise<void> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          await strategy.recover(error);
          console.log(`Error recovered using strategy: ${strategy.description}`);
          return;
        } catch (recoveryError) {
          console.error(`Recovery strategy failed: ${strategy.description}`, recoveryError);
        }
      }
    }
  }

  // Log error with appropriate level
  private logError(error: GlobalError): void {
    const logData = {
      id: error.id,
      type: error.type,
      message: error.message,
      severity: error.severity,
      timestamp: new Date(error.timestamp).toISOString(),
      context: error.context,
    };

    switch (error.severity) {
      case 'critical':
        console.error('🚨 Critical Error:', logData);
        break;
      case 'high':
        console.error('⚠️ High Severity Error:', logData);
        break;
      case 'medium':
        console.warn('⚠️ Medium Severity Error:', logData);
        break;
      case 'low':
        console.warn('ℹ️ Low Severity Error:', logData);
        break;
    }
  }

  // Send telemetry data
  private sendTelemetry(error: GlobalError): void {
    // In a real app, this would send to Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error.message), {
        tags: {
          errorType: error.type,
          severity: error.severity,
          category: error.category,
        },
        extra: {
          errorId: error.id,
          timestamp: error.timestamp,
          context: error.context,
        },
      });
    }
  }

  // Get errors by type
  public getErrorsByType<T extends GlobalError['type']>(type: T): Array<Extract<GlobalError, { type: T }>> {
    return Array.from(this.errors.values()).filter(
      (error): error is Extract<GlobalError, { type: T }> => error.type === type
    );
  }

  // Get all errors
  public getAllErrors(): GlobalError[] {
    return Array.from(this.errors.values());
  }

  // Clear errors
  public clearErrors(): void {
    this.errors.clear();
  }

  // Clear errors by type
  public clearErrorsByType(type: GlobalError['type']): void {
    for (const [key, error] of this.errors.entries()) {
      if (error.type === type) {
        this.errors.delete(key);
      }
    }
  }

  // Get error statistics
  public getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const errors = this.getAllErrors();
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    return {
      total: errors.length,
      byType: errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentErrors: errors.filter(error => error.timestamp > oneHourAgo).length,
    };
  }

  // Enable/disable telemetry
  public setTelemetryEnabled(enabled: boolean): void {
    this.telemetryEnabled = enabled;
  }
}

// Global error handling instance
export const errorHandlingSystem = new ErrorHandlingSystem();

// Error creation utilities
export const createQueryError = (
  error: any,
  queryKey: unknown[],
  queryHash: string,
  fetchStatus: 'idle' | 'fetching' | 'paused',
  failureCount: number
): QueryError => {
  const isNetworkError = !error.response && (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError');
  const isTimeoutError = error.code === 'TIMEOUT' || error.message?.includes('timeout');
  
  return {
    id: `query-${Date.now()}-${Math.random()}`,
    type: 'query',
    timestamp: Date.now(),
    message: error.message || 'Query failed',
    stack: error.stack,
    context: {
      queryKey,
      queryHash,
      fetchStatus,
      failureCount,
      originalError: error,
    },
    severity: failureCount > 2 ? 'high' : 'medium',
    category: 'query',
    handled: false,
    retryable: isNetworkError || isTimeoutError || (error.response?.status >= 500),
    queryKey,
    queryHash,
    fetchStatus,
    failureCount,
    isNetworkError,
    isTimeoutError,
  };
};

export const createMutationError = (
  error: any,
  mutationKey: string[] | undefined,
  mutationId: number,
  variables: unknown,
  failureCount: number,
  canRollback: boolean
): MutationError => {
  return {
    id: `mutation-${Date.now()}-${Math.random()}`,
    type: 'mutation',
    timestamp: Date.now(),
    message: error.message || 'Mutation failed',
    stack: error.stack,
    context: {
      mutationKey,
      mutationId,
      variables,
      failureCount,
      canRollback,
      originalError: error,
    },
    severity: canRollback ? 'medium' : 'high',
    category: 'mutation',
    handled: false,
    retryable: error.response?.status >= 500 || !error.response,
    mutationKey,
    mutationId,
    variables,
    failureCount,
    canRollback,
  };
};

export const createAppError = (
  error: Error,
  component?: string,
  props?: Record<string, any>
): AppError => {
  return {
    id: `app-${Date.now()}-${Math.random()}`,
    type: 'app',
    timestamp: Date.now(),
    message: error.message || 'Application error',
    stack: error.stack,
    context: {
      component,
      props,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
    severity: 'high',
    category: 'application',
    handled: false,
    retryable: false,
    component,
    props,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };
};

export const createNetworkError = (
  error: TypedAxiosError,
  url?: string,
  method?: string
): NetworkErrorExtended => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const isTimeout = error.type === 'network' && error.isTimeout;
  
  return {
    id: `network-${Date.now()}-${Math.random()}`,
    type: 'network',
    timestamp: Date.now(),
    message: error.message || 'Network error',
    context: {
      originalError: error,
      url,
      method,
      isOffline,
      isTimeout,
    },
    severity: isOffline ? 'medium' : 'high',
    category: 'network',
    handled: false,
    retryable: true,
    status: error.status,
    statusText: error.status ? `HTTP ${error.status}` : undefined,
    url,
    method,
    isOffline,
    isTimeout,
  };
};

// Default recovery strategies
export const defaultRecoveryStrategies: ErrorRecoveryStrategy[] = [
  {
    canRecover: (error) => error.type === 'network' && error.isOffline,
    recover: async () => {
      // Wait for network to come back online
      return new Promise((resolve) => {
        const checkOnline = () => {
          if (navigator.onLine) {
            resolve();
          } else {
            setTimeout(checkOnline, 1000);
          }
        };
        checkOnline();
      });
    },
    description: 'Wait for network reconnection',
  },
  {
    canRecover: (error) => error.type === 'query' && error.isTimeoutError,
    recover: async () => {
      // Wait before retrying timeout errors
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    description: 'Retry after timeout',
  },
  {
    canRecover: (error) => error.type === 'mutation' && error.canRollback,
    recover: async () => {
      // This would trigger the rollback mechanism
      console.log('Attempting mutation rollback...');
    },
    description: 'Rollback failed mutation',
  },
];

// Set up global error handling for React Query
export const setupGlobalErrorHandling = (queryClient: QueryClient): void => {
  // Set up query cache listeners for error handling (React Query v5 approach)
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.query.state.status === 'error') {
      const queryError = createQueryError(
        event.query.state.error,
        event.query.queryKey,
        event.query.queryHash,
        event.query.state.fetchStatus,
(event.query as any).state.failureCount || 0
      );
      errorHandlingSystem.handleError(queryError);
    }
  });

  // Set up mutation cache listeners for error handling
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.mutation.state.status === 'error') {
      const mutationError = createMutationError(
        event.mutation.state.error,
        Array.isArray(event.mutation.options.mutationKey) ? [...event.mutation.options.mutationKey] as string[] : undefined,
        event.mutation.mutationId,
        event.mutation.state.variables,
        event.mutation.state.failureCount,
        Boolean(event.mutation.state.context)
      );
      errorHandlingSystem.handleError(mutationError);
    }
  });

  // Add default recovery strategies
  defaultRecoveryStrategies.forEach(strategy => {
    errorHandlingSystem.addRecoveryStrategy(strategy);
  });

  console.log('Global error handling system initialized');
};

// Error boundary integration
export const handleErrorBoundaryError = (error: Error, errorInfo: { componentStack: string }): void => {
  const appError = createAppError(error, 'ErrorBoundary', { componentStack: errorInfo.componentStack });
  errorHandlingSystem.handleError(appError);
};

// Utility functions
export const isRetryableError = (error: GlobalError): boolean => {
  return error.retryable;
};

export const getErrorsByComponent = (component: string): AppError[] => {
  return errorHandlingSystem.getErrorsByType('app').filter(
    error => error.component === component
  );
};

export const getRecentErrors = (minutes: number = 60): GlobalError[] => {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return errorHandlingSystem.getAllErrors().filter(error => error.timestamp > cutoff);
};

export const clearOldErrors = (hours: number = 24): void => {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const allErrors = errorHandlingSystem.getAllErrors();
  
  allErrors.forEach(error => {
    if (error.timestamp < cutoff) {
      errorHandlingSystem.clearErrors();
    }
  });
};

// Export already declared above at line 252

// Type guards
export const isQueryError = (error: GlobalError): error is QueryError => error.type === 'query';
export const isMutationError = (error: GlobalError): error is MutationError => error.type === 'mutation';
export const isAppError = (error: GlobalError): error is AppError => error.type === 'app';
export const isNetworkError = (error: GlobalError): error is NetworkErrorExtended => error.type === 'network';

// Development helpers
if (__DEV__) {
  (global as any).__ERROR_HANDLING_SYSTEM__ = {
    system: errorHandlingSystem,
    getErrors: () => errorHandlingSystem.getAllErrors(),
    getStats: () => errorHandlingSystem.getErrorStats(),
    clear: () => errorHandlingSystem.clearErrors(),
    createQuery: createQueryError,
    createMutation: createMutationError,
    createApp: createAppError,
    createNetwork: createNetworkError,
  };
}