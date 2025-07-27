import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { User, Event } from '@/types/allTypes';

interface DiscoverSearchBarProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  suggestions: {
    users: User[];
    events: Event[];
  };
  placeholder: string;
  onSearchActiveChange?: (active: boolean) => void;
}

const DiscoverSearchBar: React.FC<DiscoverSearchBarProps> = ({
  inputValue,
  setInputValue,
  suggestions,
  placeholder,
  onSearchActiveChange,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);


  const handleClearSearch = () => {
    setInputValue('');
    setIsSearchFocused(false);
    onSearchActiveChange?.(false);
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
    onSearchActiveChange?.(true);
  };

  const handleInputBlur = () => {
    setIsSearchFocused(false);
    onSearchActiveChange?.(false);
  };

  return (
    <View style={{ width: '100%', position: 'relative' }}>
        {/* Search input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            height: 44,
            position: 'relative',
            width: '100%',
            zIndex: 1001,
            borderWidth: isSearchFocused ? 2 : 0,
            borderColor: isSearchFocused ? themeColors.tint : 'transparent',
          }}
        >
          <Feather 
            name="search" 
            size={18} 
            color={themeColors.placeholderTextColor} 
            style={{ marginRight: 12 }} 
          />
          <TextInput
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor={themeColors.placeholderTextColor}
            style={{
              flex: 1,
              fontSize: 16,
              color: themeColors.text,
              fontWeight: '400',
            }}
            value={inputValue}
            onChangeText={setInputValue}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inputValue.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={{ padding: 4 }}
            >
              <Feather 
                name="x" 
                size={16} 
                color={themeColors.placeholderTextColor} 
              />
            </TouchableOpacity>
          )}
        </View>
    </View>
  );
};

export default DiscoverSearchBar; 