import React from 'react';
import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder, value, onChangeText }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemedView 
      className="flex-row items-center rounded-lg p-3 justify-center w-[95%]"
      style={{
        borderWidth: 1, // Explicitly define the border width
        borderStyle: 'solid',
        borderColor: Colors[colorScheme ?? 'dark'].border,
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      }}
    >
      {/* Search Icon */}
      <Feather name="search" size={20} color={Colors[colorScheme ?? 'dark'].border} className="mr-2" />
      {/* Search Input */}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={Colors[colorScheme ?? 'dark'].border} // Light gray placeholder text
        value={value}
        onChangeText={onChangeText}
        className="flex-1 text-gray-700"
      />
    </ThemedView>
  );
};

export default SearchBar;