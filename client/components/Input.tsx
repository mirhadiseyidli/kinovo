import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

interface InputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
}

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  ...props
}) => {
  return (
    <ThemedView style={{ width: '100%', aspectRatio: 'auto', marginBottom: 8 }}>
      <TextInput
        style={{
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          textAlign: 'left',
          fontSize: 14, // Approximate equivalent to text-[3.5vw] (adjust as needed)
          borderColor: error ? 'red' : '#D1D5DB', // Tailwind border-red-500 or border-gray-300
        }}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
      {error && (
        <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </ThemedView>
  );
};

export default Input;