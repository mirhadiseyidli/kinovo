import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { User, Event } from '@/types/allTypes';

interface DiscoverSearchBarProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  suggestions: {
    users: User[];
    events: Event[];
  };
  placeholder: string;
}

const DiscoverSearchBar: React.FC<DiscoverSearchBarProps> = ({
  inputValue,
  setInputValue,
  suggestions,
  placeholder,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const users = suggestions?.users ?? [];
  const events = suggestions?.events ?? [];
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Show suggestions when there are results and input is focused
  useEffect(() => {
    setShowSuggestions(isSearchFocused && (users.length > 0 || events.length > 0));
  }, [isSearchFocused, users.length, events.length]);

  const handleUserPress = (user: User) => {
    // Navigate to user profile using the correct dynamic route
    router.push({
      pathname: "/(auth)/(tabs)/(profile)/[_id]" as const,
      params: { _id: user._id }
    });
    setInputValue(''); // Clear search after selection
    setIsSearchFocused(false);
    inputRef.current?.blur();
  };

  const handleEventPress = (event: Event) => {
    // Navigate to event details
    if (event._id) {
      router.push({
        pathname: "/(auth)/(viewEvent)/[event_id]" as const,
        params: { event_id: event._id }
      });
    }
    setInputValue(''); // Clear search after selection
    setIsSearchFocused(false);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setInputValue('');
    setIsSearchFocused(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
  };

  const handleBackdropPress = () => {
    setIsSearchFocused(false);
    inputRef.current?.blur();
  };

  return (
    <>
      {/* Backdrop overlay - covers entire screen but positioned behind search components */}
      {showSuggestions && (
        <Pressable
          style={{
            position: 'absolute',
            top: -1000, // Extend way up
            left: -1000, // Extend way left
            right: -1000, // Extend way right
            bottom: -1000, // Extend way down
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999, // Behind search components
          }}
          onPress={handleBackdropPress}
        />
      )}

      <View style={{ width: '100%', position: 'relative', zIndex: 1000 }}>
        {/* Search input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8, // Match login input border radius
            paddingHorizontal: 16,
            height: 44, // Match login input height
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
            onBlur={() => setIsSearchFocused(false)}
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

        {/* Results dropdown */}
        {showSuggestions && (
          <ThemedView style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderWidth: 1,
            borderColor: themeColors.border,
            borderRadius: 8,
            maxHeight: 300,
            width: '100%',
            position: 'absolute',
            top: 52, // Adjusted for new height
            left: 0,
            zIndex: 1002,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <ScrollView 
              style={{ maxHeight: 300 }} 
              keyboardShouldPersistTaps={'always'} 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {users.length > 0 && (
                <>
                  <View style={{ 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    borderBottomWidth: 1, 
                    borderBottomColor: themeColors.border 
                  }}>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: themeColors.text,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      Users
                    </Text>
                  </View>
                  {users.map((user, index) => (
                    <TouchableOpacity
                      key={user._id}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: index !== users.length - 1 || events.length > 0 ? 1 : 0,
                        borderBottomColor: themeColors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      onPress={() => handleUserPress(user)}
                    >
                      <Image
                        source={user.profile_picture ? { uri: user.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          marginRight: 12,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          fontWeight: '600', 
                          fontSize: 16, 
                          color: themeColors.text 
                        }}>
                          {user.full_name}
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          color: themeColors.placeholderTextColor 
                        }}>
                          @{user.username}
                        </Text>
                      </View>
                      <Feather 
                        name="arrow-up-right" 
                        size={16} 
                        color={themeColors.placeholderTextColor} 
                      />
                    </TouchableOpacity>
                  ))}
                </>
              )}
              
              {events.length > 0 && (
                <>
                  <View style={{ 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    borderBottomWidth: 1, 
                    borderBottomColor: themeColors.border 
                  }}>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: themeColors.text,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      Events
                    </Text>
                  </View>
                  {events.map((event, index) => (
                    <TouchableOpacity
                      key={event._id}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: index !== events.length - 1 ? 1 : 0,
                        borderBottomColor: themeColors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      onPress={() => handleEventPress(event)}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: themeColors.tint,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <Feather 
                          name="calendar" 
                          size={20} 
                          color={themeColors.background} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          fontWeight: '600', 
                          fontSize: 16, 
                          color: themeColors.text 
                        }}>
                          {event.title}
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          color: themeColors.placeholderTextColor 
                        }}>
                          {event?.start_time ? new Date(event.start_time).toLocaleDateString() : 'Date TBD'}
                        </Text>
                      </View>
                      <Feather 
                        name="arrow-up-right" 
                        size={16} 
                        color={themeColors.placeholderTextColor} 
                      />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </ThemedView>
        )}
      </View>
    </>
  );
};

export default DiscoverSearchBar; 