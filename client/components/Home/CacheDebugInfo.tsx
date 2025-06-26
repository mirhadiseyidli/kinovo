import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { cacheManager } from '@/utils/homeScreenCache';

interface CacheDebugInfoProps {
  visible?: boolean;
}

const CacheDebugInfo: React.FC<CacheDebugInfoProps> = React.memo(({ visible = __DEV__ }) => {
  const [stats, setStats] = useState<any>({});
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setStats(cacheManager.getAllStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <ThemedView 
      style={{
        position: 'absolute',
        top: 100,
        right: 10,
        backgroundColor: themeColors.background,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: themeColors.border,
        opacity: 0.9,
        zIndex: 1000,
      }}
    >
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.tint }}>
          🗂️ Cache {expanded ? '▼' : '▶'}
        </ThemedText>
      </TouchableOpacity>
      
      {expanded && (
        <View style={{ marginTop: 8, minWidth: 200 }}>
          {Object.entries(stats).map(([key, cacheStats]: [string, any]) => (
            <View key={key} style={{ marginBottom: 4 }}>
              <ThemedText style={{ fontSize: 10, fontWeight: '600' }}>
                {key}:
              </ThemedText>
              <ThemedText style={{ fontSize: 9, opacity: 0.8, marginLeft: 8 }}>
                Size: {cacheStats.size}/{cacheStats.maxSize}
              </ThemedText>
            </View>
          ))}
          
          <TouchableOpacity 
            onPress={() => {
              cacheManager.clearAll();
              setStats(cacheManager.getAllStats());
            }}
            style={{ 
              backgroundColor: themeColors.tint, 
              padding: 4, 
              borderRadius: 4, 
              marginTop: 8 
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
});

CacheDebugInfo.displayName = 'CacheDebugInfo';

export default CacheDebugInfo; 