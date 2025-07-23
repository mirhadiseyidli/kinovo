import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Import both versions
import AttentionRequiredLegacy from './attention-required';
import AttentionRequiredV2 from './attention-required.v2';

/**
 * Migration wrapper for A/B testing AttentionRequired stack page
 * 
 * This allows you to test and compare both versions of the stack page.
 * Perfect for gradual migration and performance comparison.
 */

export default function AttentionRequiredMigrationScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get version from URL params or default to v2
  const initialVersion = (params.version as 'legacy' | 'v2') || 'v2';
  const [currentVersion, setCurrentVersion] = React.useState<'legacy' | 'v2'>(initialVersion);
  const [compareMode, setCompareMode] = React.useState(false);

  // Performance monitoring
  const performanceRef = React.useRef({
    legacy: { renderTime: 0, loadTime: 0, errorCount: 0 },
    v2: { renderTime: 0, loadTime: 0, errorCount: 0 },
  });

  const handleVersionChange = (version: 'legacy' | 'v2') => {
    setCurrentVersion(version);
    
    // Update URL params to maintain state on navigation
    router.setParams({ version });
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
  };

  const showPerformanceReport = () => {
    const report = performanceRef.current;
    Alert.alert(
      'Performance Comparison',
      `Legacy: ${report.legacy.renderTime}ms render, ${report.legacy.errorCount} errors\n` +
      `TanStack v2: ${report.v2.renderTime}ms render, ${report.v2.errorCount} errors`,
      [{ text: 'OK' }]
    );
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Header actions
  const headerRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {/* Performance Report Button */}
      <TouchableOpacity
        onPress={showPerformanceReport}
        style={{
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <ThemedText style={{ fontSize: 10, color: themeColors.text }}>
          📊
        </ThemedText>
      </TouchableOpacity>

      {/* Compare Mode Toggle */}
      <TouchableOpacity
        onPress={toggleCompareMode}
        style={{
          backgroundColor: compareMode ? themeColors.tint : themeColors.eventCardBackgroundColor,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <ThemedText style={{
          fontSize: 10,
          color: compareMode ? '#fff' : themeColors.text,
          fontWeight: '600',
        }}>
          Compare
        </ThemedText>
      </TouchableOpacity>

      {/* Version Toggle (only in non-compare mode) */}
      {!compareMode && (
        <View style={{
          flexDirection: 'row',
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderRadius: 6,
          padding: 2,
        }}>
          <TouchableOpacity
            onPress={() => handleVersionChange('legacy')}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: currentVersion === 'legacy' ? themeColors.tint : 'transparent',
            }}
          >
            <ThemedText style={{
              fontSize: 9,
              fontWeight: '600',
              color: currentVersion === 'legacy' ? '#fff' : themeColors.text,
            }}>
              Legacy
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleVersionChange('v2')}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: currentVersion === 'v2' ? themeColors.tint : 'transparent',
            }}
          >
            <ThemedText style={{
              fontSize: 9,
              fontWeight: '600',
              color: currentVersion === 'v2' ? '#fff' : themeColors.text,
            }}>
              v2
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Side-by-side comparison mode
  if (compareMode) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            headerTitle: 'Attention Required - Comparison',
            headerTintColor: themeColors.text,
            headerStyle: {
              backgroundColor: themeColors.background,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerLeft: () => (
              <TouchableOpacity onPress={goBack}>
                <Feather name="chevron-left" size={24} color={themeColors.text} />
              </TouchableOpacity>
            ),
            headerRight,
          }}
        />

        {/* Comparison Headers */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
        }}>
          <ThemedText style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: '600',
            color: themeColors.text,
          }}>
            Legacy Version
          </ThemedText>
          <View style={{
            width: 1,
            backgroundColor: themeColors.border,
            marginHorizontal: 8,
          }} />
          <ThemedText style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: '600',
            color: themeColors.text,
          }}>
            TanStack v2
          </ThemedText>
        </View>
        
        {/* Side by Side Views */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <AttentionRequiredLegacy />
          </View>
          <View style={{
            width: 1,
            backgroundColor: themeColors.border,
          }} />
          <View style={{ flex: 1 }}>
            <AttentionRequiredV2 />
          </View>
        </View>
      </ThemedView>
    );
  }

  // Single version mode
  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: `Attention Required - ${currentVersion === 'legacy' ? 'Legacy' : 'TanStack v2'}`,
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity onPress={goBack}>
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
          headerRight,
        }}
      />

      {/* Render selected version */}
      {currentVersion === 'legacy' ? (
        <AttentionRequiredLegacy />
      ) : (
        <AttentionRequiredV2 />
      )}
    </ThemedView>
  );
}

/**
 * Usage Examples:
 * 
 * 1. Navigate with specific version:
 * ```tsx
 * router.push('/(auth)/attention-required-migration?version=v2');
 * ```
 * 
 * 2. Navigate with comparison mode:
 * ```tsx
 * router.push('/(auth)/attention-required-migration');
 * // Then toggle compare mode in the header
 * ```
 * 
 * 3. Default to legacy for testing:
 * ```tsx
 * router.push('/(auth)/attention-required-migration?version=legacy');
 * ```
 */