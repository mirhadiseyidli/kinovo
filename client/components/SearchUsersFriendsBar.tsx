import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView, Image, Keyboard } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 16,
          position: 'relative',
          // flex: 1,
          overflow: 'visible',
          zIndex: 1
        }}
      >
        <Feather name="user-plus" size={16} color={themeColors.placeholderTextColor} style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            flex: 1,
            fontSize: 16,
            color: themeColors.text
          }}
          value={inputValue}
          onChangeText={setInputValue}
          // onFocus={() => setIsFocused(true)}
          // onBlur={() => setIsFocused(false)}
          // ref={inputRef}
        />
      </View>

      {/* Suggestions List */}
      {suggestions.length > 0 && 
        <ThemedView style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderWidth: 1,
          borderColor: themeColors.background,
          borderRadius: 8,
          maxHeight: 250,
          width: '100%',
          position: 'absolute',
          top: 60,
          left: 0,
          zIndex: 10
        }}>
          <ScrollView 
            style={{ maxHeight: 250 }} 
            keyboardShouldPersistTaps={'always'} 
            nestedScrollEnabled={true}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item._id}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: themeColors.background,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => handleAdd(item)}
              >
                <Image
                  source={item.profile_picture ? { uri: item.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                />
                <View style={{ flexDirection: 'column' }} >
                  <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{item.full_name}</Text>
                  <Text style={{ color: themeColors.placeholderTextColor }}>{item.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      }
    </View>
  );
};

export default SearchUsersFriendsBar;