import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Import both versions
import PastEventsLegacy from './PastEvents';
import PastEventsV2 from './PastEvents.v2';

/**
 * Migration wrapper for A/B testing PastEvents components
 * 
 * This component allows you to:
 * 1. Test both versions side by side
 * 2. Gradually migrate users to the new version
 * 3. Compare performance and behavior
 * 4. Rollback if needed
 * 5. Monitor date filtering performance
 */

interface PastEventsMigrationProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
  
  // Migration controls
  version?: 'legacy' | 'v2' | 'compare';
  showVersionToggle?: boolean;
  onVersionChange?: (version: 'legacy' | 'v2') => void;
}

const PastEventsMigration: React.FC<PastEventsMigrationProps> = ({
  refreshing,
  onFinishRefresh,
  version = 'v2',
  showVersionToggle = false,
  onVersionChange,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [currentVersion, setCurrentVersion] = React.useState<'legacy' | 'v2'>(
    version === 'compare' ? 'v2' : version
  );

  const handleVersionChange = (newVersion: 'legacy' | 'v2') => {
    setCurrentVersion(newVersion);
    onVersionChange?.(newVersion);
  };

  // Performance monitoring
  const performanceRef = React.useRef({
    legacy: { renderTime: 0, filterTime: 0, errorCount: 0 },
    v2: { renderTime: 0, filterTime: 0, errorCount: 0 },
  });

  const startTime = React.useRef(Date.now());
  React.useEffect(() => {
    const renderTime = Date.now() - startTime.current;
    performanceRef.current[currentVersion].renderTime = renderTime;
    console.log(`[PastEvents Migration] ${currentVersion} render time: ${renderTime}ms`);
  });

  // Common props for both versions
  const commonProps = {
    refreshing,
    onFinishRefresh,
  };

  // Render version toggle
  const renderVersionToggle = () => {
    if (!showVersionToggle) return null;

    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: themeColors.background,
        borderTopWidth: 1,
        borderTopColor: themeColors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderRadius: 8,
          padding: 4,
        }}>
          <TouchableOpacity
            onPress={() => handleVersionChange('legacy')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: currentVersion === 'legacy' ? themeColors.tint : 'transparent',
            }}
          >
            <ThemedText style={{
              fontSize: 12,
              fontWeight: '600',
              color: currentVersion === 'legacy' ? '#fff' : themeColors.text,
            }}>
              Legacy
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleVersionChange('v2')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: currentVersion === 'v2' ? themeColors.tint : 'transparent',
            }}
          >
            <ThemedText style={{
              fontSize: 12,
              fontWeight: '600',
              color: currentVersion === 'v2' ? '#fff' : themeColors.text,
            }}>
              TanStack v2
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Performance Indicator */}
        <View style={{
          marginLeft: 8,
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 6,
          justifyContent: 'center',
        }}>
          <ThemedText style={{
            fontSize: 10,
            color: themeColors.textSecondary,
          }}>
            📊 {performanceRef.current[currentVersion].renderTime}ms
          </ThemedText>
        </View>
      </View>
    );
  };

  // Side-by-side comparison mode
  if (version === 'compare') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 8,
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
        
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: themeColors.border }}>
            <PastEventsLegacy {...commonProps} />
          </View>
          <View style={{ flex: 1 }}>
            <PastEventsV2 {...commonProps} />
          </View>
        </View>

        {/* Performance Comparison Footer */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: themeColors.eventCardBackgroundColor,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
        }}>
          <ThemedText style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 10,
            color: themeColors.textSecondary,
          }}>
            Render: {performanceRef.current.legacy.renderTime}ms
          </ThemedText>
          <ThemedText style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 10,
            color: themeColors.textSecondary,
          }}>
            Render: {performanceRef.current.v2.renderTime}ms
          </ThemedText>
        </View>
      </View>
    );
  }

  // Single version mode
  return (
    <View style={{ flex: 1 }}>
      {currentVersion === 'legacy' ? (
        <PastEventsLegacy {...commonProps} />
      ) : (
        <PastEventsV2 {...commonProps} />
      )}
      {renderVersionToggle()}
    </View>
  );
};

export default PastEventsMigration;

/**
 * Usage Examples:
 * 
 * 1. Gradual Migration (Feature Flag):
 * ```tsx
 * <PastEventsMigration
 *   version={useFeatureFlag('past-events-v2') ? 'v2' : 'legacy'}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 2. A/B Testing:
 * ```tsx
 * <PastEventsMigration
 *   version={userSegment === 'beta' ? 'v2' : 'legacy'}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 3. Side-by-Side Comparison (Development):
 * ```tsx
 * <PastEventsMigration
 *   version="compare"
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 4. Manual Testing with Toggle:
 * ```tsx
 * <PastEventsMigration
 *   version="v2"
 *   showVersionToggle={__DEV__}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * Key Testing Areas:
 * - Date filtering performance (v2 uses query-level filtering)
 * - Event grouping rendering speed
 * - Memory usage during large event lists
 * - Filter modal interactions
 * - Pull-to-refresh behavior
 * - Empty state handling
 */