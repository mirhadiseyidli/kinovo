import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Dimensions, ScrollView, Image, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SearchBarProps } from '@/types/allTypes';

const SearchUsersFriendsBar = ({
  inputValue,
  setInputValue,
  suggestions,
  handleAdd,
  placeholder,
}: SearchBarProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const users = suggestions?.users ?? [];
  const events = suggestions?.events ?? [];

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
          width: '100%',
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
        />
      </View>

      {(users.length > 0 || events.length > 0) && 
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
            {users.length > 0 && (
              <>
                <Text style={{ fontWeight: 'bold', padding: 8, color: themeColors.text }}>Users</Text>
                {users.map((user, index) => (
                  <TouchableOpacity
                    key={user._id}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== users.length - 1 ? 1 : 0,
                      borderBottomColor: themeColors.background,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => handleAdd(user)}
                  >
                    <Image
                      source={user.profile_picture ? { uri: user.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flexDirection: 'column' }} >
                      <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{user.full_name}</Text>
                      <Text style={{ color: themeColors.placeholderTextColor }}>{user.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {events.length > 0 && (
              <>
                <Text style={{ fontWeight: 'bold', padding: 8, color: themeColors.text }}>Events</Text>
                {events.map((event, index) => (
                  <TouchableOpacity
                    key={event._id}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderBottomWidth: index !== events.length - 1 ? 1 : 0,
                      borderBottomColor: themeColors.background,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => handleAdd(event)}
                  >
                    <View style={{ flexDirection: 'column' }} >
                      <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{event.title}</Text>
                      <Text style={{ color: themeColors.placeholderTextColor }}>{event?.start_time ? new Date(event.start_time).toLocaleDateString() : ''}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </ThemedView>
      }
    </View>
  );
};

export default SearchUsersFriendsBar;