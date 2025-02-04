import React from 'react';
import { View, TextInput, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const EventName: React.FC = () => {
  const placeholder = "Enter event name";
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          height: screenWidth / 10,
        }}
      >
        {/* Feather Icon */}
        <Feather name="type" size={18} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />

        {/* Text Input */}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            flex: 1, // Take up the remaining space
            fontSize: 14,
          }}
        />
      </View>
    </ThemedView>
  );
};

export default EventName;