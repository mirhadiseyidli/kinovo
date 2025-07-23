import React, { useRef, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCreateEventContext } from '@/context/CreateEventContext';

const EventName: React.FC = () => {
  const placeholder = "Enter event name";
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { title, settingEventTitle } = useCreateEventContext();
  
  const debounceRef = useRef<number | null>(null);

  const handleTextChange = (text: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // Update immediately instead of debouncing for better UX
    settingEventTitle(text);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors.inputBackgroundColor,
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 44,
      }}
    >
      {/* Feather Icon */}
      <Feather name="type" size={20} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />

      {/* Text Input */}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={themeColors.placeholderTextColor}
        onChangeText={handleTextChange}
        value={title}
        style={{
          flex: 1, // Take up the remaining space
          fontSize: 16,
          color: themeColors.text
        }}
      />
    </View>
  );
};

export default EventName;