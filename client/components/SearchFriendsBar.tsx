import React from 'react';
import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SearchBarProps, SearchFriendsProps } from '@/types/allTypes';

const SearchFriendsBar: React.FC<SearchFriendsProps> = ({ placeholder, value, onChangeText }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
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
        placeholderTextColor={themeColors.placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        style={{
          flex: 1,
          color: themeColors.text,
          fontSize: 16,
        }}
      />
    </ThemedView>
  );
};

export default SearchFriendsBar;