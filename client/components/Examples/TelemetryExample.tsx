import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { 
  useTelemetry, 
  initializeTelemetry,
  TelemetryProviders,
} from '@/hooks/useTelemetryHooks';
import { useTelemetryIntegration } from '@/hooks/useTelemetryIntegration';
import { useCreateEventMutation } from '@/hooks/useTypedMutations';
import { useInfiniteUpcomingEventsQuery } from '@/hooks/useInfiniteEventsQuery';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { jwtDecode } from 'jwt-decode';

/**
 * Telemetry Example Component
 * 
 * This component demonstrates how to use the telemetry hooks with:
 * - Automatic query and mutation tracking
 * - Business metrics tracking
 * - Performance monitoring
 * - Error tracking
 * - Integration with multiple providers
 */

// Mock telemetry providers for demonstration
const mockTelemetryProviders: TelemetryProviders = {
  sentry: {
    captureException: (error: Error, context?: any) => {
      console.log('📊 Sentry - Exception:', error.message, context);
    },
    captureMessage: (message: string, level?: string) => {
      console.log(`📊 Sentry - Message (${level}):`, message);
    },
    addBreadcrumb: (breadcrumb: any) => {
      console.log('📊 Sentry - Breadcrumb:', breadcrumb);
    },
    setTag: (key: string, value: string) => {
      console.log('📊 Sentry - Tag:', key, '=', value);
    },
    setUser: (user: any) => {
      console.log('📊 Sentry - User:', user);
    },
    setContext: (name: string, context: any) => {
      console.log('📊 Sentry - Context:', name, context);
    },
  },
  newRelic: {
    addPageAction: (name: string, attributes?: any) => {
      console.log('📊 New Relic - Page Action:', name, attributes);
    },
    setCustomAttribute: (name: string, value: string | number) => {
      console.log('📊 New Relic - Custom Attribute:', name, '=', value);
    },
    recordMetric: (name: string, value: number) => {
      console.log('📊 New Relic - Metric:', name, '=', value);
    },
    noticeError: (error: Error, attributes?: any) => {
      console.log('📊 New Relic - Error:', error.message, attributes);
    },
  },
  analytics: {
    track: (event: string, properties?: any) => {
      console.log('📊 Analytics - Track:', event, properties);
    },
    identify: (userId: string, traits?: any) => {
      console.log('📊 Analytics - Identify:', userId, traits);
    },
    page: (category?: string, name?: string, properties?: any) => {
      console.log('📊 Analytics - Page:', category, name, properties);
    },
  },
  customLogger: {
    log: (level: string, message: string, metadata?: any) => {
      console.log(`📊 Custom Logger - ${level.toUpperCase()}:`, message, metadata);
    },
    metric: (name: string, value: number, tags?: any) => {
      console.log('📊 Custom Logger - Metric:', name, '=', value, tags);
    },
    event: (name: string, properties?: any) => {
      console.log('📊 Custom Logger - Event:', name, properties);
    },
  },
};

export const TelemetryExample: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { accessToken } = useAuthSession();
  const userId = accessToken?.current ? (jwtDecode(accessToken.current) as any)?._id : null;
  
  const [telemetryInitialized, setTelemetryInitialized] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  
  // Initialize telemetry
  useEffect(() => {
    if (!telemetryInitialized) {
      initializeTelemetry(mockTelemetryProviders);
      setTelemetryInitialized(true);
    }
  }, [telemetryInitialized]);
  
  // Use telemetry hooks
  const {
    trackEvent,
    trackError,
    trackTiming,
    sessionId,
  } = useTelemetry();
  
  const {
    trackUserEngagement,
    trackFeatureUsage,
    trackEventInteraction,
    trackSearchQuery,
    trackNavigationEvent,
    startPerformanceMeasure,
    endPerformanceMeasure,
    trackRenderTime,
    trackMemoryUsage,
    trackQueryError,
    trackMutationError,
    trackComponentError,
    trackNetworkError,
  } = useTelemetryIntegration();
  
  // Use actual queries/mutations for demonstration
  const createEventMutation = useCreateEventMutation();
  const { events, isLoading, error } = useInfiniteUpcomingEventsQuery({
    userId: userId || '',
    pageSize: 5,
    enabled: !!userId,
  });
  
  // Don't render in production
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Telemetry Example only available in development</Text>
      </View>
    );
  }
  
  // Business metrics examples
  const handleTrackUserEngagement = () => {
    trackUserEngagement('button_click', {
      buttonName: 'Track User Engagement',
      timestamp: Date.now(),
    });
  };
  
  const handleTrackFeatureUsage = () => {
    trackFeatureUsage('telemetry_example', {
      feature: 'telemetry_tracking',
      userId,
      timestamp: Date.now(),
    });
  };
  
  const handleTrackEventInteraction = () => {
    if (events.length > 0 && events[0]._id) {
      trackEventInteraction(events[0]._id, 'view_details', {
        eventTitle: events[0].title,
        timestamp: Date.now(),
      });
    } else {
      Alert.alert('No Events', 'No events available to track interaction');
    }
  };
  
  const handleTrackSearchQuery = () => {
    trackSearchQuery('example search', 42, {
      searchType: 'events',
      filters: ['category:social'],
      timestamp: Date.now(),
    });
  };
  
  const handleTrackNavigation = () => {
    trackNavigationEvent('telemetry_example', 'home_screen', {
      timestamp: Date.now(),
    });
  };
  
  // Performance metrics examples
  const handleStartPerformanceMeasure = () => {
    startPerformanceMeasure('example_operation');
    
    // Simulate some work
    setTimeout(() => {
      endPerformanceMeasure('example_operation', {
        operationType: 'data_processing',
        itemsProcessed: 100,
      });
    }, Math.random() * 2000 + 500);
  };
  
  const handleTrackRenderTime = () => {
    const renderTime = Math.random() * 100 + 10;
    trackRenderTime('TelemetryExample', renderTime);
  };
  
  const handleTrackMemoryUsage = () => {
    trackMemoryUsage();
  };
  
  // Error tracking examples
  const handleTrackQueryError = () => {
    const mockError = new Error('Mock query error for demonstration');
    trackQueryError(mockError, ['events', 'upcoming'], {
      queryHash: 'mock_query_hash',
      retryCount: 2,
    });
  };
  
  const handleTrackMutationError = () => {
    const mockError = new Error('Mock mutation error for demonstration');
    trackMutationError(mockError, ['events', 'create'], {
      mutationId: 'mock_mutation_id',
      variables: { title: 'Mock Event' },
    });
  };
  
  const handleTrackComponentError = () => {
    const mockError = new Error('Mock component error for demonstration');
    trackComponentError(mockError, 'TelemetryExample', {
      props: { userId },
      state: { telemetryInitialized },
    });
  };
  
  const handleTrackNetworkError = () => {
    const mockError = new Error('Mock network error for demonstration');
    trackNetworkError(mockError, '/api/events', 'GET', {
      statusCode: 500,
      responseTime: 5000,
    });
  };
  
  // Mutation example with telemetry
  const handleCreateEventWithTelemetry = async () => {
    try {
      trackEvent('create_event_attempt', {
        source: 'telemetry_example',
        timestamp: Date.now(),
      });
      
      const startTime = Date.now();
      
      await createEventMutation.mutateAsync({
        title: `Telemetry Test Event ${eventCount + 1}`,
        description: 'This event was created to demonstrate telemetry tracking',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        location: {
          text: 'Telemetry Test Location',
          city: 'Test City',
          state: 'Test State',
          coordinates: { lat: 0, lng: 0 }
        },
        category: 'other',
        visibility: 'public',
      });
      
      const duration = Date.now() - startTime;
      trackTiming('create_event_duration', duration);
      
      setEventCount(prev => prev + 1);
      
      trackEvent('create_event_success', {
        duration,
        eventCount: eventCount + 1,
        timestamp: Date.now(),
      });
      
      Alert.alert('Success', 'Event created successfully! Check console for telemetry logs.');
      
    } catch (error) {
      trackError(error as Error, {
        operation: 'create_event',
        source: 'telemetry_example',
      });
      
      Alert.alert('Error', 'Failed to create event. Check console for telemetry logs.');
    }
  };
  
  // Generic event tracking
  const handleTrackCustomEvent = () => {
    trackEvent('custom_event', {
      customProperty: 'custom_value',
      timestamp: Date.now(),
      userId,
      sessionId,
    });
  };
  
  const handleTrackError = () => {
    const mockError = new Error('This is a mock error for demonstration');
    trackError(mockError, {
      source: 'telemetry_example',
      timestamp: Date.now(),
    });
  };
  
  const handleTrackTiming = () => {
    const mockDuration = Math.random() * 1000 + 100;
    trackTiming('mock_operation', mockDuration, {
      operationType: 'data_processing',
      timestamp: Date.now(),
    });
  };
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20 }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 20,
        }}>
          Telemetry Example
        </Text>
        
        {/* Status Display */}
        <View style={{
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            Telemetry Status
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Initialized: {telemetryInitialized ? 'Yes' : 'No'}
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Session ID: {sessionId}
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            User ID: {userId || 'Not logged in'}
          </Text>
          <Text style={{ color: colors.text, marginBottom: 4 }}>
            Events Created: {eventCount}
          </Text>
          <Text style={{ color: colors.text }}>
            Query Status: {isLoading ? 'Loading' : error ? 'Error' : 'Success'}
          </Text>
        </View>
        
        {/* Business Metrics */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}>
            📊 Business Metrics
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackUserEngagement}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                User Engagement
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackFeatureUsage}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Feature Usage
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackEventInteraction}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Event Interaction
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackSearchQuery}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Search Query
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackNavigation}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Navigation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Performance Metrics */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}>
            ⚡ Performance Metrics
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleStartPerformanceMeasure}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Performance Measure
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackRenderTime}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Render Time
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackMemoryUsage}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Memory Usage
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Error Tracking */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}>
            🚨 Error Tracking
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackQueryError}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Query Error
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackMutationError}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Mutation Error
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackComponentError}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Component Error
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackNetworkError}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Network Error
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Generic Tracking */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}>
            🔧 Generic Tracking
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackCustomEvent}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Custom Event
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackError}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Custom Error
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 12,
                borderRadius: 8,
                flex: 1,
                minWidth: 120,
                alignItems: 'center',
              }}
              onPress={handleTrackTiming}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                Custom Timing
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Real Mutation Example */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}>
            🧪 Real Mutation Example
          </Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: colors.background,
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
              opacity: createEventMutation.isPending ? 0.5 : 1,
            }}
            onPress={handleCreateEventWithTelemetry}
            disabled={createEventMutation.isPending || !userId}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                {createEventMutation.isPending ? 'Creating Event...' : 'Create Event with Telemetry'}
            </Text>
          </TouchableOpacity>
          
          {!userId && (
            <Text style={{
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              fontSize: 12,
            }}>
              Please log in to create events
            </Text>
          )}
        </View>
        
        {/* Instructions */}
        <View style={{
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            📝 Instructions
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • Click any button to see telemetry logs in the console
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • All telemetry is mocked for demonstration purposes
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, marginBottom: 4 }}>
            • In production, replace mock providers with real ones
          </Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>
            • Telemetry automatically tracks all queries and mutations
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default TelemetryExample;