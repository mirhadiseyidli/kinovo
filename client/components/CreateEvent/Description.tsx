import React, { useState, useRef, useEffect } from 'react';
import type { ChangeEventHandler } from '@/types/allTypes';
import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCreateEventContext } from '@/context/CreateEventContext';

const Description: React.FC = () => {
  const placeholder = "Write about your event...";
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { description, settingEventDescription } = useCreateEventContext();
  const [input, setInput] = useState<string>(description || ''); 
  const debounceRef = useRef<number | null>(null);

  // Update local state when context changes (e.g., when loading existing event)
  useEffect(() => {
    if (description !== null) {
      setInput(description);
    }
  }, [description]);

  // Handle Text Change
  const handleTextChange = (text: string) => {
    setInput(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Update immediately for better UX
    settingEventDescription(text.trim() === '' ? null : text);
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
        backgroundColor: themeColors.inputBackgroundColor,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 120, // One-third of screen height
        alignItems: 'flex-start'
      }}
    >
      {/* Feather Icon */}
      <Feather name="edit" size={24} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />

      {/* Text Input */}
      <TextInput
        value={input} // Controlled component
        onChangeText={handleTextChange} // Handle text input
        placeholder={placeholder}
        placeholderTextColor={themeColors.placeholderTextColor}
        multiline
        numberOfLines={4} // Used for iOS hint but height is set dynamically
        style={{
          flex: 1, // Take remaining space
          width: '100%',
          height: '100%',
          fontSize: 16,
          color: themeColors.text
        }}
      />
    </View>
  );
};

export default Description;