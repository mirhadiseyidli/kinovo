import React, { useRef, useEffect } from 'react';
import { View, TextInput, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCreateEvent } from '@/hooks/useCreateEvent';
import { useCreateEventContext } from '@/context/CreateEventContext';

const EventName: React.FC = () => {
  const placeholder = "Enter event name";
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { settingEventTitle } = useCreateEventContext();
  const { width } = Dimensions.get('window');
  
  const debounceRef = useRef<number | null>(null);

  const handleTextChange = (text: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      settingEventTitle(text);
    }, 5000);
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