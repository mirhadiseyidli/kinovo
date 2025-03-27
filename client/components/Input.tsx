import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { InputProps } from '@/types/allTypes';

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  leftIcon,
  ...props
}) => {
  return (
    // Need to add leftIcon to placeholder
    <ThemedView style={{ width: '100%', aspectRatio: 'auto', marginBottom: 8 }}>
      <TextInput
        style={{
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          textAlign: 'left',
          fontSize: 14, // Approximate equivalent to text-[3.5vw] (adjust as needed)
        }}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </ThemedView>
  );
};

export default Input;