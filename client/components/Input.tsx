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
    <ThemedView className="w-full aspect-auto mb-2">
      <TextInput
        className={`border rounded-lg px-3 py-3 text-start text-[3.5vw] ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
      {error && <Text className="text-red-500 text-[3vw] mt-1">{error}</Text>}
    </ThemedView>
  );
};

export default Input;

// className={`border rounded-lg px-3 py-3 mb-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}