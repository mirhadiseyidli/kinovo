import React from 'react';
import { View, TextInput } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder
}: PasswordInputProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View 
      style={{
        marginBottom: 24,
      }}
    >
      <ThemedText style={{ fontSize: 16, marginBottom: 8, fontWeight: 'bold' }}>{label}</ThemedText>
      <TextInput 
        value={value} 
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.placeholderTextColor}
        secureTextEntry
        style={{
          fontSize: 16, 
          color: themeColors.text,
          paddingVertical: 8,
        }}
      />
    </View>
  );
};

export default PasswordInput; 