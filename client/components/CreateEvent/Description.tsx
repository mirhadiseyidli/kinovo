import React, { useState } from 'react';
import type { ChangeEventHandler } from '@/types/allTypes';
import { View, TextInput, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const Description: React.FC = () => {
  const [input, setInput] = useState<ChangeEventHandler['input']>(''); // Track input value
  const placeholder = "Write about your event...";
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Handle Text Change
  const handleTextChange: ChangeEventHandler['handleTextChange'] = (text) => {
    setInput(text.trim() === '' ? '' : text); // If trimmed input is empty, reset to empty string
  };

  return (
    <ThemedView style={{ marginBottom: 24, justifyContent: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          height: screenWidth / 3, // One-third of screen height
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
            fontSize: 16,
            color: themeColors.text
          }}
        />
      </View>
    </ThemedView>
  );
};

export default Description;