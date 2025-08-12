import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SearchUsersFriendsBarProps } from '@/types/allTypes';

interface SearchUsersFriendsBarModifiedProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  suggestions: any[];
  handleAdd: (item: any) => void;
  placeholder: string;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSuggestionSelectRef: React.MutableRefObject<((item: any) => void) | null>;
  onInputPositionChange?: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

const SearchUsersFriendsBar = ({
  inputValue,
  setInputValue,
  suggestions,
  handleAdd,
  placeholder,
  showSuggestions,
  setShowSuggestions,
  onSuggestionSelectRef,
  onInputPositionChange,
}: SearchUsersFriendsBarModifiedProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);

  // Show suggestions when there are results and input is focused
  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0);
  }, [isFocused, suggestions.length]);

  const handleInputFocus = () => {
    // Measure input position and pass to parent
    containerRef.current?.measureInWindow((x, y, width, height) => {
      onInputPositionChange?.({ x, y, width, height });
    });
    
    setIsFocused(true);
  };

  const handleSuggestionPress = (item: any) => {
    handleAdd(item);
    setInputValue('');
    setIsFocused(false);
    setShowSuggestions(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  // Expose the internal handler to parent via ref
  React.useEffect(() => {
    onSuggestionSelectRef.current = handleSuggestionPress;
  }, [handleSuggestionPress]);

  return (
    <View>
      <View
        ref={containerRef}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          height: 44,
          paddingHorizontal: 16,
          paddingVertical: 12,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Feather name="user-plus" size={16} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            flex: 1,
            fontSize: 16,
            color: themeColors.text
          }}
          value={inputValue}
          onChangeText={setInputValue}
          onFocus={handleInputFocus}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    </View>
  );
};

export default SearchUsersFriendsBar;