import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Import both versions
import UpcomingEventsLegacy from './UpcomingEvents';
import UpcomingEventsTanStack from './UpcomingEvents.v2';

/**
 * Migration wrapper component for A/B testing UpcomingEvents
 * 
 * This component allows for:
 * - Side-by-side comparison of legacy vs TanStack versions
 * - Easy switching between implementations
 * - Performance comparison
 * - Feature flag based rollout
 * - Rollback capability
 */

interface UpcomingEventsMigrationProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
  // Migration control props
  useTanStack?: boolean;
  enableABTest?: boolean;
  debugMode?: boolean;
}

const UpcomingEventsMigration: React.FC<UpcomingEventsMigrationProps> = ({
  refreshing,
  onFinishRefresh,
  useTanStack = false, // Default to legacy
  enableABTest = false,
  debugMode = false
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showTanStack, setShowTanStack] = useState(useTanStack);
  const [showComparison, setShowComparison] = useState(false);

  // Feature flag logic - could be replaced with your feature flag system
  const shouldUseTanStack = () => {
    if (enableABTest) {
      // A/B test logic - use user ID hash for consistent assignment
      // For now, just use Math.random for demo
      return Math.random() < 0.5; // 50% rollout
    }
    return useTanStack;
  };

  const actuallyUseTanStack = showComparison ? showTanStack : shouldUseTanStack();

  if (debugMode) {
    return (
      <ThemedView style={{ flex: 1 }}>
        {/* Debug Controls */}
        <View style={{
          backgroundColor: themeColors.background,
          padding: 12,
          marginBottom: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}>
          <ThemedText style={{ 
            fontSize: 14, 
            fontWeight: '600',
            color: themeColors.text,
            marginBottom: 8 
          }}>
            🚧 Migration Debug Mode
          </ThemedText>
          
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => setShowTanStack(false)}
              style={{
                backgroundColor: !showTanStack ? themeColors.tint : themeColors.tabIconDefault,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                flex: 1,
              }}
            >
              <Text style={{ 
                color: '#fff', 
                fontSize: 12, 
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Legacy Version
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowTanStack(true)}
              style={{
                backgroundColor: showTanStack ? themeColors.tint : themeColors.tabIconDefault,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                flex: 1,
              }}
            >
              <Text style={{ 
                color: '#fff', 
                fontSize: 12, 
                fontWeight: '600',
                textAlign: 'center'
              }}>
                TanStack Version
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={() => setShowComparison(!showComparison)}
            style={{
              backgroundColor: themeColors.tabIconSelected,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <Text style={{ 
              color: '#fff', 
              fontSize: 12, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {showComparison ? 'Hide Comparison' : 'Show Side-by-Side'}
            </Text>
          </TouchableOpacity>

          <ThemedText style={{ 
            fontSize: 11, 
            color: themeColors.text,
            opacity: 0.8 
          }}>
            Currently showing: {showTanStack ? 'TanStack' : 'Legacy'} version
            {enableABTest && !showComparison && ' (A/B Test Active)'}
          </ThemedText>
        </View>

        {/* Side-by-side comparison */}
        {showComparison ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600',
                marginBottom: 8,
                textAlign: 'center',
                color: themeColors.tabIconDefault
              }}>
                Legacy Version
              </ThemedText>
              <UpcomingEventsLegacy
                refreshing={refreshing}
                onFinishRefresh={onFinishRefresh}
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600',
                marginBottom: 8,
                textAlign: 'center',
                color: themeColors.tint
              }}>
                TanStack Version
              </ThemedText>
              <UpcomingEventsTanStack
                refreshing={refreshing}
                onFinishRefresh={onFinishRefresh}
              />
            </View>
          </View>
        ) : (
          /* Single version */
          actuallyUseTanStack ? (
            <UpcomingEventsTanStack
              refreshing={refreshing}
              onFinishRefresh={onFinishRefresh}
            />
          ) : (
            <UpcomingEventsLegacy
              refreshing={refreshing}
              onFinishRefresh={onFinishRefresh}
            />
          )
        )}
      </ThemedView>
    );
  }

  // Production mode - just show the selected version
  return actuallyUseTanStack ? (
    <UpcomingEventsTanStack
      refreshing={refreshing}
      onFinishRefresh={onFinishRefresh}
    />
  ) : (
    <UpcomingEventsLegacy
      refreshing={refreshing}
      onFinishRefresh={onFinishRefresh}
    />
  );
};

/**
 * Hook for controlled migration with feature flags
 */
export const useMigrationControl = (featureName: string) => {
  // This would typically integrate with your feature flag system
  // For now, we'll use localStorage or environment variables
  
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`feature_${featureName}`);
      return saved ? JSON.parse(saved) : false;
    }
    return process.env[`EXPO_PUBLIC_FEATURE_${featureName.toUpperCase()}`] === 'true';
  });

  const enableFeature = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`feature_${featureName}`, JSON.stringify(enabled));
    }
  };

  const rollback = () => {
    enableFeature(false);
    Alert.alert(
      'Feature Rollback',
      `${featureName} has been rolled back to the previous version.`
    );
  };

  return {
    isEnabled,
    enableFeature,
    rollback,
  };
};

/**
 * Performance monitoring hook for migration
 */
export const useMigrationMetrics = (componentName: string, version: 'legacy' | 'tanstack') => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    errorCount: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
  });

  const trackRenderTime = () => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime: renderTime
      }));

      // Log metrics for analysis
      console.log(`${componentName} (${version}) render time:`, renderTime + 'ms');
    };
  };

  const trackError = (error: Error) => {
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    console.error(`${componentName} (${version}) error:`, error);
  };

  const trackRefresh = (success: boolean) => {
    setMetrics(prev => ({
      ...prev,
      successfulRefreshes: success ? prev.successfulRefreshes + 1 : prev.successfulRefreshes,
      failedRefreshes: !success ? prev.failedRefreshes + 1 : prev.failedRefreshes,
    }));
  };

  return {
    metrics,
    trackRenderTime,
    trackError,
    trackRefresh,
  };
};

export default UpcomingEventsMigration;