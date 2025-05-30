import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView, Image, Keyboard, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SearchUsersFriendsBarProps } from '@/types/allTypes';

const SearchUsersFriendsBar = ({
  inputValue,
  setInputValue,
  suggestions,
  handleAdd,
  placeholder,
}: SearchUsersFriendsBarProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Show suggestions when there are results and input is focused
  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0);
  }, [isFocused, suggestions.length]);

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleBackdropPress = () => {
    setIsFocused(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleSuggestionPress = (item: any) => {
    handleAdd(item);
    setInputValue('');
    setIsFocused(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  return (
    <>
      {showSuggestions && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1,
          }}
          onPress={handleBackdropPress}
        />
      )}
      <View style={{ zIndex: 2 }}>
        <View
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

        {/* Suggestions List */}
        {showSuggestions && (
          <View style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderWidth: 1,
            borderColor: themeColors.background,
            borderRadius: 8,
            maxHeight: 300,
            width: '100%',
            position: 'absolute',
            top: 52,
            left: 0,
            zIndex: 10,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <ScrollView 
              style={{ maxHeight: 300 }} 
              keyboardShouldPersistTaps="always" 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={item._id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.border,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <Image
                    source={item.profile_picture ? { uri: item.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 12,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 16, color: themeColors.text }}>{item.full_name}</Text>
                    <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </>
  );
};

export default SearchUsersFriendsBar;