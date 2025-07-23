import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useUpcomingEventsQuery } from '@/hooks/useUpcomingEventsQuery';
import { useCreateEventMutation } from '@/hooks/useTypedMutations';
import { DevToolsController, DevToolsDebugInfo } from '@/components/DevTools/DevToolsController';
import { 
  performanceMonitor, 
  exportDevToolsState, 
  getDevToolsLogs,
  getQueryInspector 
} from '@/utils/devtools';

/**
 * DevTools Example Component
 * 
 * This component demonstrates how to use React Query DevTools in development
 * with real queries and mutations to show debugging capabilities.
 * 
 * Features demonstrated:
 * - Real-time query monitoring
 * - Mutation logging and debugging
 * - Performance monitoring
 * - Cache inspection
 * - DevTools state export
 * - Query performance timing
 */

export const DevToolsExample: React.FC = () => {
  const [queryCount, setQueryCount] = useState(0);
  const [mutationCount, setMutationCount] = useState(0);

  // Example queries to generate DevTools data
  const upcomingEvents = useUpcomingEventsQuery({
    displayMode: 'full',
    enableSmoothTransitions: true,
    keepPreviousData: true,
  });

  const createEventMutation = useCreateEventMutation();

  // Don't render in production
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>DevTools Example only available in development</Text>
      </View>
    );
  }

  const handleTriggerQuery = () => {
    setQueryCount(count => count + 1);
    upcomingEvents.refetch();
  };

  const handleTriggerMutation = async () => {
    setMutationCount(count => count + 1);
    
    const eventData = {
      title: `Test Event ${mutationCount + 1}`,
      description: `This is a test event created to demonstrate DevTools functionality`,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      location: {
        text: 'DevTools Test Location',
        city: 'Test City',
        state: 'Test State', 
        coordinates: { lat: 0, lng: 0 }
      },
      category: 'other' as const,
      visibility: 'public',
    };

    try {
      await createEventMutation.mutateAsync(eventData);
      Alert.alert('Success', 'Test event created for DevTools demo');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test event');
    }
  };

  const handlePerformanceTest = () => {
    const timer = performanceMonitor.startTimer(['performance-test']);
    
    // Simulate some work
    setTimeout(() => {
      const duration = timer();
      Alert.alert(
        'Performance Test',
        `Simulated operation took ${duration}ms`
      );
    }, Math.random() * 2000 + 500); // Random delay between 500-2500ms
  };

  const handleSlowQueryTest = () => {
    performanceMonitor.logSlowQueries(100); // Log queries slower than 100ms
    Alert.alert('Slow Query Check', 'Check console for slow query results');
  };

  const handleCacheMetrics = () => {
    performanceMonitor.logCacheMetrics();
    Alert.alert('Cache Metrics', 'Cache metrics logged to console');
  };

  const handleExportState = () => {
    const state = exportDevToolsState();
    console.log('=== DevTools State Export ===');
    console.log('Config:', state.config);
    console.log('Performance:', state.performance);
    console.log('Inspector:', state.inspector);
    console.log('Logs:', state.logs);
    Alert.alert('Export Complete', 'DevTools state exported to console');
  };

  const handleInspectCache = () => {
    const inspector = getQueryInspector();
    if (inspector) {
      console.log('=== Cache Inspector ===');
      console.log('Queries:', inspector.queries);
      console.log('Mutations:', inspector.mutations);
      console.log('Cache Size:', inspector.cacheSize);
      Alert.alert('Cache Inspection', 'Cache data logged to console');
    }
  };

  const handleViewLogs = () => {
    const logs = getDevToolsLogs();
    console.log('=== DevTools Logs ===');
    console.log('Total logs:', logs.length);
    console.log('Recent logs:', logs.slice(-10));
    Alert.alert('Logs Exported', 'Recent logs exported to console');
  };

  const generateStressTest = async () => {
    Alert.alert('Stress Test', 'Generating multiple queries and mutations...');
    
    // Generate multiple queries
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        upcomingEvents.refetch();
      }, i * 200);
    }

    // Generate multiple mutations
    for (let i = 0; i < 3; i++) {
      setTimeout(async () => {
        try {
          await createEventMutation.mutateAsync({
            title: `Stress Test Event ${i + 1}`,
            description: 'Generated for stress testing',
            start_time: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + (i + 1) * 25 * 60 * 60 * 1000).toISOString(),
            location: {
              text: 'Stress Test Location',
              city: 'Test City',
              state: 'Test State',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'other' as const,
            visibility: 'private',
          });
        } catch (error) {
          console.error('Stress test mutation failed:', error);
        }
      }, i * 500);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Debug Info Overlay */}
      <DevToolsDebugInfo />

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          DevTools Example
        </Text>

        {/* Query Status */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Query Status
          </Text>
          <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8 }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Status: {upcomingEvents.isLoading ? 'Loading' : upcomingEvents.isError ? 'Error' : 'Success'}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Is Fetching: {upcomingEvents.isFetching ? 'Yes' : 'No'}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Data Count: {upcomingEvents.data.length}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Queries Triggered: {queryCount}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Last Updated: {upcomingEvents.dataUpdatedAt ? new Date(upcomingEvents.dataUpdatedAt).toLocaleTimeString() : 'Never'}
            </Text>
          </View>
        </View>

        {/* Mutation Status */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Mutation Status
          </Text>
          <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8 }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Status: {createEventMutation.isPending ? 'Loading' : createEventMutation.isError ? 'Error' : createEventMutation.isSuccess ? 'Success' : 'Idle'}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Mutations Triggered: {mutationCount}
            </Text>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>
              Failure Count: {createEventMutation.failureCount}
            </Text>
            {createEventMutation.isSuccess && (
              <Text style={{ fontSize: 14, marginBottom: 5, color: '#4CAF50' }}>
                Last Created: {createEventMutation.data?.title}
              </Text>
            )}
            {createEventMutation.isError && (
              <Text style={{ fontSize: 14, marginBottom: 5, color: '#F44336' }}>
                Error: {createEventMutation.error?.message}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            DevTools Actions
          </Text>
          
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#2196F3',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleTriggerQuery}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Trigger Query Refetch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF9800',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleTriggerMutation}
              disabled={createEventMutation.isPending}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {createEventMutation.isPending ? 'Creating...' : 'Trigger Mutation'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handlePerformanceTest}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Performance Test
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#9C27B0',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={generateStressTest}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Stress Test (Multiple Operations)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debugging Tools */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Debugging Tools
          </Text>
          
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#607D8B',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleSlowQueryTest}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Check Slow Queries
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#795548',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleCacheMetrics}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Log Cache Metrics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF5722',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleInspectCache}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Inspect Cache
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#3F51B5',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleViewLogs}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                View Recent Logs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#E91E63',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleExportState}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Export DevTools State
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Development Tips */}
        <View style={{ 
          backgroundColor: '#e8f5e8', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            💡 Development Tips
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            • Check console logs for detailed DevTools output
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            • Use the floating DevTools button to control settings
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            • Performance metrics help identify slow queries
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            • Export state for debugging production issues
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            • DevTools automatically disabled in production builds
          </Text>
        </View>

        {/* Console Commands */}
        <View style={{ 
          backgroundColor: '#fff3cd', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            🚀 Console Commands
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
            __REACT_QUERY_DEVTOOLS__.toggle()
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
            __REACT_QUERY_DEVTOOLS__.config()
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
            __REACT_QUERY_DEVTOOLS__.logs()
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
            __REACT_QUERY_DEVTOOLS__.inspector()
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
            __REACT_QUERY_DEVTOOLS__.export()
          </Text>
        </View>
      </ScrollView>

      {/* DevTools Controller */}
      <DevToolsController />
    </View>
  );
};

export default DevToolsExample;