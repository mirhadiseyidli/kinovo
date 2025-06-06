import React from 'react';
import { View, TextInput } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';

interface LabeledInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const LabeledInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none'
}: LabeledInputProps) => {
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
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          fontSize: 16, 
          color: themeColors.text,
          paddingVertical: 8,
        }}
      />
    </View>
  );
};

export default LabeledInput; 