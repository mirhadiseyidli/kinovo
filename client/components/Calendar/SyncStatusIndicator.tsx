import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SyncStatusIndicatorProps {
  syncing: boolean;
  synced: boolean;
  error?: string | null;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncing,
  synced,
  error,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  if (syncing) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ActivityIndicator size="small" color={themeColors.mountainGreen} />
        {!compact && <ThemedText style={{ fontSize: 12 }}>Syncing...</ThemedText>}
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="alert-circle" size={16} color="#FF4444" />
        {!compact && (
          <ThemedText style={{ fontSize: 12, color: '#FF4444' }}>
            Sync failed
          </ThemedText>
        )}
      </View>
    );
  }

  if (synced) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="check-circle" size={16} color={themeColors.mountainGreen} />
        {!compact && (
          <ThemedText style={{ fontSize: 12, color: themeColors.mountainGreen }}>
            Synced
          </ThemedText>
        )}
      </View>
    );
  }

  return null;
};