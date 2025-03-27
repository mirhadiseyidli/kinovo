import React from 'react';
import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SearchBarProps } from '@/types/allTypes';

const SearchBar: React.FC<SearchBarProps> = ({ placeholder, value, onChangeText }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        justifyContent: 'center',
        width: '100%',
        backgroundColor: themeColors.inputBackgroundColor,
      }}
    >
      {/* Search Icon */}
      <Feather
        name="search"
        size={20}
        color={themeColors.icon}
        style={{ marginRight: 8 }}
      />
      {/* Search Input */}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={themeColors.placeholderTextColor} // Light gray placeholder text
        value={value}
        onChangeText={onChangeText}
        style={{
          flex: 1,
          color: themeColors.tint, // Equivalent to text-gray-700
        }}
      />
    </ThemedView>
  );
};

export default SearchBar;