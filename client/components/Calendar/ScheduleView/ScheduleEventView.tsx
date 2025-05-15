import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

type ScheduleEventViewProps = {
  title: string;
  time: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

const ScheduleEventView: React.FC<ScheduleEventViewProps> = ({ title, time, iconName, iconColor = '#34D399' }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View
      style={{
        // backgroundColor: themeColors.,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <LinearGradient
        colors={[themeColors.cardColorsGradientOne, themeColors.cardColorsGradientTwo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 12,
          opacity: 0.9, // Slight transparency for a sleeker look
        }}
      />
      <View>
        <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: themeColors.textThird, fontSize: 14, marginTop: 4 }}>{time}</Text>
      </View>
      <Ionicons name={iconName} size={24} color={iconColor} />
    </View>
  );
};

export default ScheduleEventView;