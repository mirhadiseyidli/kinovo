import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Event } from '@/types/allTypes';
import DefaultProfilePicture from './DefaultProfilePicture';

interface DiscoverSearchBarSuggestionsProps {
  visible: boolean;
  suggestions: {
    users: User[];
    events: Event[];
  };
  onUserPress: (user: User) => void;
  onEventPress: (event: Event) => void;
  onBackdropPress: () => void;
}

const DiscoverSearchBarSuggestions: React.FC<DiscoverSearchBarSuggestionsProps> = ({
  visible,
  suggestions,
  onUserPress,
  onEventPress,
  onBackdropPress,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const safeAreaInsets = useSafeAreaInsets();
  const users = suggestions?.users ?? [];
  const events = suggestions?.events ?? [];

  // Calculate fixed position based on known search bar location
  // Header (~60px) + Search bar margin (5px) + Search bar height (44px) + margin (8px)
  const suggestionsTop = safeAreaInsets.top + 40 + 8;

  if (!visible || (!users.length && !events.length)) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
        }}
        onPress={onBackdropPress}
      />

      {/* Suggestions dropdown */}
      <ThemedView style={{
        backgroundColor: themeColors.inputBackgroundColor,
        borderWidth: 1,
        borderColor: themeColors.border,
        borderRadius: 8,
        maxHeight: 300,
        position: 'absolute',
        top: suggestionsTop,
        left: 16,
        right: 16,
        zIndex: 10000,
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
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
                  onPress={() => onUserPress(user)}
                >
                  <View style={{ marginRight: 12 }}>
                    <DefaultProfilePicture
                      profilePicture={user.profile_picture}
                      fullName={user.full_name}
                      size={40}
                      borderRadius={20}
                    />
                  </View>
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
                  onPress={() => onEventPress(event)}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: themeColors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Feather 
                      name="calendar" 
                      size={20} 
                      color={themeColors.text} 
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
    </>
  );
};

export default DiscoverSearchBarSuggestions;