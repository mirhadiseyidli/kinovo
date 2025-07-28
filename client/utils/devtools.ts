import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * React Query DevTools Configuration
 * 
 * This module provides enhanced DevTools setup for development builds with:
 * - Conditional loading only in development
 * - Persistent DevTools settings
 * - Toggle mechanisms for visibility
 * - Performance monitoring
 * - Query inspection utilities
 */

// DevTools storage keys
const DEVTOOLS_STORAGE_KEYS = {
  ENABLED: 'REACT_QUERY_DEVTOOLS_ENABLED',
  POSITION: 'REACT_QUERY_DEVTOOLS_POSITION',
  MINIMIZED: 'REACT_QUERY_DEVTOOLS_MINIMIZED',
  PANEL_HEIGHT: 'REACT_QUERY_DEVTOOLS_PANEL_HEIGHT',
  SHOW_NETWORK_LOGS: 'REACT_QUERY_DEVTOOLS_NETWORK_LOGS',
  SHOW_MUTATION_LOGS: 'REACT_QUERY_DEVTOOLS_MUTATION_LOGS',
};

// DevTools configuration interface
export interface DevToolsConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  minimized: boolean;
  panelHeight: number;
  showNetworkLogs: boolean;
  showMutationLogs: boolean;
  showQueryKeys: boolean;
  showTimestamps: boolean;
  maxLogEntries: number;
}

// Default DevTools configuration
const DEFAULT_DEVTOOLS_CONFIG: DevToolsConfig = {
  enabled: __DEV__,
  position: 'bottom',
  minimized: false,
  panelHeight: 300,
  showNetworkLogs: true,
  showMutationLogs: true,
  showQueryKeys: true,
  showTimestamps: true,
  maxLogEntries: 100,
};

// DevTools state management
class DevToolsManager {
  private config: DevToolsConfig = DEFAULT_DEVTOOLS_CONFIG;
  private queryClient: QueryClient | null = null;
  private logs: Array<{
    type: 'query' | 'mutation' | 'network' | 'cache';
    timestamp: number;
    data: any;
    queryKey?: unknown[];
    status?: string;
  }> = [];

  async initialize(queryClient: QueryClient) {
    this.queryClient = queryClient;
    
    // Only initialize in development
    if (!__DEV__) {
      return;
    }

    // Load persisted configuration
    await this.loadConfiguration();

    // Set up query logging
    this.setupQueryLogging();

    // Set up mutation logging
    this.setupMutationLogging();

    console.log('React Query DevTools initialized:', this.config);
  }

  private async loadConfiguration() {
    try {
      const stored = await AsyncStorage.multiGet([
        DEVTOOLS_STORAGE_KEYS.ENABLED,
        DEVTOOLS_STORAGE_KEYS.POSITION,
        DEVTOOLS_STORAGE_KEYS.MINIMIZED,
        DEVTOOLS_STORAGE_KEYS.PANEL_HEIGHT,
        DEVTOOLS_STORAGE_KEYS.SHOW_NETWORK_LOGS,
        DEVTOOLS_STORAGE_KEYS.SHOW_MUTATION_LOGS,
      ]);

      const config = stored.reduce((acc, [key, value]) => {
        if (value !== null) {
          const configKey = Object.keys(DEVTOOLS_STORAGE_KEYS).find(
            k => DEVTOOLS_STORAGE_KEYS[k as keyof typeof DEVTOOLS_STORAGE_KEYS] === key
          );
          
          if (configKey) {
            switch (configKey) {
              case 'ENABLED':
              case 'MINIMIZED':
              case 'SHOW_NETWORK_LOGS':
              case 'SHOW_MUTATION_LOGS':
                acc[key] = value === 'true';
                break;
              case 'PANEL_HEIGHT':
                acc[key] = parseInt(value, 10);
                break;
              case 'POSITION':
                acc[key] = value;
                break;
            }
          }
        }
        return acc;
      }, {} as any);

      this.config = { ...this.config, ...config };
    } catch (error) {
      console.warn('Failed to load DevTools configuration:', error);
    }
  }

  private async saveConfiguration() {
    try {
      await AsyncStorage.multiSet([
        [DEVTOOLS_STORAGE_KEYS.ENABLED, this.config.enabled.toString()],
        [DEVTOOLS_STORAGE_KEYS.POSITION, this.config.position],
        [DEVTOOLS_STORAGE_KEYS.MINIMIZED, this.config.minimized.toString()],
        [DEVTOOLS_STORAGE_KEYS.PANEL_HEIGHT, this.config.panelHeight.toString()],
        [DEVTOOLS_STORAGE_KEYS.SHOW_NETWORK_LOGS, this.config.showNetworkLogs.toString()],
        [DEVTOOLS_STORAGE_KEYS.SHOW_MUTATION_LOGS, this.config.showMutationLogs.toString()],
      ]);
    } catch (error) {
      console.warn('Failed to save DevTools configuration:', error);
    }
  }

  private setupQueryLogging() {
    if (!this.queryClient) return;

    // Set up global query cache listeners
    this.queryClient.getQueryCache().subscribe((event) => {
      if (this.config.showNetworkLogs) {
        this.addLog({
          type: 'query',
          timestamp: Date.now(),
          data: {
            type: event.type,
            query: {
              queryKey: event.query.queryKey,
              queryHash: event.query.queryHash,
              status: event.query.state.status,
              fetchStatus: event.query.state.fetchStatus,
              dataUpdatedAt: event.query.state.dataUpdatedAt,
              error: event.query.state.error,
              failureCount: (event.query as any).state.failureCount || 0,
            },
          },
          queryKey: event.query.queryKey,
          status: event.query.state.status,
        });
      }
    });
  }

  private setupMutationLogging() {
    if (!this.queryClient) return;

    // Set up global mutation cache listeners
    this.queryClient.getMutationCache().subscribe((event) => {
      if (this.config.showMutationLogs) {
        this.addLog({
          type: 'mutation',
          timestamp: Date.now(),
          data: {
            type: event.type,
            mutation: {
              mutationKey: event.mutation?.options.mutationKey,
              mutationId: event.mutation?.mutationId,
              status: event.mutation?.state.status,
              variables: event.mutation?.state.variables,
              data: event.mutation?.state.data,
              error: event.mutation?.state.error,
              failureCount: event.mutation?.state.failureCount || 0,
            },
          },
          status: event.mutation?.state.status,
        });
      }
    });
  }

  private addLog(log: typeof this.logs[0]) {
    this.logs.push(log);
    
    // Keep only the latest entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }
  }

  // Public API
  public async toggle() {
    this.config.enabled = !this.config.enabled;
    await this.saveConfiguration();
    console.log('DevTools toggled:', this.config.enabled);
  }

  public async setPosition(position: DevToolsConfig['position']) {
    this.config.position = position;
    await this.saveConfiguration();
  }

  public async setMinimized(minimized: boolean) {
    this.config.minimized = minimized;
    await this.saveConfiguration();
  }

  public async setPanelHeight(height: number) {
    this.config.panelHeight = Math.max(100, Math.min(height, 600));
    await this.saveConfiguration();
  }

  public async toggleNetworkLogs() {
    this.config.showNetworkLogs = !this.config.showNetworkLogs;
    await this.saveConfiguration();
  }

  public async toggleMutationLogs() {
    this.config.showMutationLogs = !this.config.showMutationLogs;
    await this.saveConfiguration();
  }

  public getConfig(): DevToolsConfig {
    return { ...this.config };
  }

  public getLogs() {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public getQueryInspector() {
    if (!this.queryClient) return null;

    const queryCache = this.queryClient.getQueryCache();
    const mutationCache = this.queryClient.getMutationCache();

    return {
      queries: queryCache.getAll().map(query => ({
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        state: query.state,
        observers: query.getObserversCount(),
        lastUpdated: query.state.dataUpdatedAt,
        staleTime: (query.options as any).staleTime,
        gcTime: query.options.gcTime,
      })),
      mutations: mutationCache.getAll().map(mutation => ({
        mutationKey: mutation.options.mutationKey,
        mutationId: mutation.mutationId,
        state: mutation.state,
        variables: mutation.state.variables,
        submittedAt: mutation.state.submittedAt,
      })),
      cacheSize: queryCache.getAll().length,
      mutationCount: mutationCache.getAll().length,
    };
  }

  public exportState() {
    const inspector = this.getQueryInspector();
    
    return {
      timestamp: Date.now(),
      config: this.config,
      logs: this.logs,
      inspector,
      performance: {
        cacheHitRate: this.calculateCacheHitRate(),
        averageQueryTime: this.calculateAverageQueryTime(),
        failureRate: this.calculateFailureRate(),
      },
    };
  }

  private calculateCacheHitRate(): number {
    const queryLogs = this.logs.filter(log => log.type === 'query');
    const cacheHits = queryLogs.filter(log => 
      log.data?.query?.fetchStatus === 'idle' && log.data?.query?.status === 'success'
    );
    return queryLogs.length > 0 ? (cacheHits.length / queryLogs.length) * 100 : 0;
  }

  private calculateAverageQueryTime(): number {
    const queryLogs = this.logs.filter(log => 
      log.type === 'query' && log.data?.query?.dataUpdatedAt
    );
    
    if (queryLogs.length === 0) return 0;
    
    const totalTime = queryLogs.reduce((sum, log) => {
      const duration = log.data?.query?.dataUpdatedAt ? 
        (log.data.query.dataUpdatedAt - log.timestamp) : 0;
      return sum + Math.max(0, duration);
    }, 0);
    
    return totalTime / queryLogs.length;
  }

  private calculateFailureRate(): number {
    const queryLogs = this.logs.filter(log => log.type === 'query');
    const failures = queryLogs.filter(log => log.data?.query?.error);
    return queryLogs.length > 0 ? (failures.length / queryLogs.length) * 100 : 0;
  }
}

// Global DevTools instance
export const devToolsManager = new DevToolsManager();

// DevTools initialization function
export const initializeDevTools = async (queryClient: QueryClient) => {
  await devToolsManager.initialize(queryClient);
};

// DevTools toggle function for development
export const toggleDevTools = async () => {
  await devToolsManager.toggle();
};

// DevTools configuration helpers
export const getDevToolsConfig = () => devToolsManager.getConfig();
export const getDevToolsLogs = () => devToolsManager.getLogs();
export const getQueryInspector = () => devToolsManager.getQueryInspector();
export const exportDevToolsState = () => devToolsManager.exportState();
export const clearDevToolsLogs = () => devToolsManager.clearLogs();

// Development-only exports
if (__DEV__) {
  // Add global DevTools access for debugging
  (global as any).__REACT_QUERY_DEVTOOLS__ = {
    manager: devToolsManager,
    toggle: toggleDevTools,
    config: getDevToolsConfig,
    logs: getDevToolsLogs,
    inspector: getQueryInspector,
    export: exportDevToolsState,
    clear: clearDevToolsLogs,
  };
  
  console.log('React Query DevTools available via global.__REACT_QUERY_DEVTOOLS__');
}

// Performance monitoring utilities
export const performanceMonitor = {
  startTimer: (queryKey: unknown[]) => {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      console.log(`Query [${JSON.stringify(queryKey)}] took ${duration}ms`);
      return duration;
    };
  },
  
  logSlowQueries: (threshold: number = 1000) => {
    const logs = devToolsManager.getLogs();
    const slowQueries = logs.filter(log => 
      log.type === 'query' && 
      log.data?.query?.dataUpdatedAt && 
      (log.data.query.dataUpdatedAt - log.timestamp) > threshold
    );
    
    if (slowQueries.length > 0) {
      console.warn('Slow queries detected:', slowQueries);
    }
    
    return slowQueries;
  },
  
  logCacheMetrics: () => {
    const state = devToolsManager.exportState();
    console.log('Cache Metrics:', {
      cacheHitRate: `${state.performance.cacheHitRate.toFixed(2)}%`,
      averageQueryTime: `${state.performance.averageQueryTime.toFixed(2)}ms`,
      failureRate: `${state.performance.failureRate.toFixed(2)}%`,
      totalQueries: state.inspector?.cacheSize || 0,
      totalMutations: state.inspector?.mutationCount || 0,
    });
  },
};

// DevTools keyboard shortcuts (development only)
if (__DEV__) {
  // These would be set up in a React Native app with appropriate key handling
  console.log('DevTools keyboard shortcuts available:');
  console.log('- Ctrl+Shift+Q: Toggle DevTools');
  console.log('- Ctrl+Shift+C: Clear logs');
  console.log('- Ctrl+Shift+E: Export state');
  console.log('- Ctrl+Shift+P: Log performance metrics');
}