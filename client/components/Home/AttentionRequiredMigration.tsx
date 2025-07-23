import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Event } from '@/types/allTypes';

// Import both versions
import AttentionRequiredLegacy from './AttentionRequired';
import AttentionRequiredV2 from './AttentionRequired.v2';

/**
 * Migration wrapper for A/B testing AttentionRequired components
 * 
 * This component allows you to:
 * 1. Test both versions side by side
 * 2. Gradually migrate users to the new version
 * 3. Compare performance and behavior
 * 4. Rollback if needed
 */

interface AttentionRequiredMigrationProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
  initialEvents?: Event[];
  showHeader?: boolean;
  
  // Migration controls
  version?: 'legacy' | 'v2' | 'compare';
  showVersionToggle?: boolean;
  onVersionChange?: (version: 'legacy' | 'v2') => void;
}

const AttentionRequiredMigration: React.FC<AttentionRequiredMigrationProps> = ({
  refreshing,
  onFinishRefresh,
  initialEvents,
  showHeader = true,
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
  const startTime = React.useRef(Date.now());
  React.useEffect(() => {
    const renderTime = Date.now() - startTime.current;
    console.log(`[AttentionRequired Migration] ${currentVersion} render time: ${renderTime}ms`);
  });

  // Common props for both versions
  const commonProps = {
    refreshing,
    onFinishRefresh,
    initialEvents,
    showHeader,
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
            <AttentionRequiredLegacy {...commonProps} />
          </View>
          <View style={{ flex: 1 }}>
            <AttentionRequiredV2 {...commonProps} />
          </View>
        </View>
      </View>
    );
  }

  // Single version mode
  return (
    <View style={{ flex: 1 }}>
      {currentVersion === 'legacy' ? (
        <AttentionRequiredLegacy {...commonProps} />
      ) : (
        <AttentionRequiredV2 {...commonProps} />
      )}
      {renderVersionToggle()}
    </View>
  );
};

export default AttentionRequiredMigration;

/**
 * Usage Examples:
 * 
 * 1. Gradual Migration (Feature Flag):
 * ```tsx
 * <AttentionRequiredMigration
 *   version={useFeatureFlag('attention-required-v2') ? 'v2' : 'legacy'}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 2. A/B Testing:
 * ```tsx
 * <AttentionRequiredMigration
 *   version={userSegment === 'beta' ? 'v2' : 'legacy'}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 3. Side-by-Side Comparison (Development):
 * ```tsx
 * <AttentionRequiredMigration
 *   version="compare"
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 * 
 * 4. Manual Testing with Toggle:
 * ```tsx
 * <AttentionRequiredMigration
 *   version="v2"
 *   showVersionToggle={__DEV__}
 *   refreshing={refreshing}
 *   onFinishRefresh={onFinishRefresh}
 * />
 * ```
 */