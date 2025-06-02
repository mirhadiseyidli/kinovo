import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { InputProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  leftIcon,
  style,
  ...props
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    // Need to add leftIcon to placeholder
    <ThemedView style={{ width: '100%', marginBottom: 8 }}>
      <TextInput
        style={[{
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 14,
        }, style]}
        placeholder={placeholder}
        placeholderTextColor={themeColors.placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </ThemedView>
  );
};

export default Input;