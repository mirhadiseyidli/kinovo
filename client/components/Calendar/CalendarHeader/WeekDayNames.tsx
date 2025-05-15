import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { ThemedText } from '@/components/ThemedText';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';

const WeekDayNames: React.FC<{ refreshing: boolean }> = ({ refreshing }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const width = Dimensions.get('window').width;
  const cellWidth = Math.floor(width / 7);
  const cellHeight = Math.floor(width / 4);

  return (
    <ThemedView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        {'SMTWTFS'.split('').map((d, i) => (
          <View key={i} style={{ width: cellWidth, alignItems: 'center', paddingVertical: 8 }}>
            <ThemedText style={{ fontWeight: '600' }}>{d}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
};

export default WeekDayNames;
