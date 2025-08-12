import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { Portal } from 'react-native-portalize';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AttendeeFriend } from '@/types/allTypes';
import DefaultProfilePicture from '@/components/DefaultProfilePicture';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';

interface SuggestionsData {
  friends: AttendeeFriend[];
  nonFriends: AttendeeFriend[];
  tags: {
    activity_name: string;
    friends: AttendeeFriend[];
  }[];
}

interface FriendSuggestionsDropdownProps {
  suggestionsData: SuggestionsData;
  showSuggestions: boolean;
  onSuggestionSelect: (item: any) => void;
  inputPosition: { x: number; y: number; width: number; height: number };
}

const FriendSuggestionsDropdown: React.FC<FriendSuggestionsDropdownProps> = ({
  suggestionsData,
  showSuggestions,
  onSuggestionSelect,
  inputPosition,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  if (!showSuggestions || (suggestionsData.friends.length === 0 && suggestionsData.nonFriends.length === 0 && suggestionsData.tags.length === 0)) {
    return null;
  }

  return (
    <Portal>
      <View
        style={{
          position: 'absolute',
          top: inputPosition.y + inputPosition.height + 4, // Position below the input
          left: inputPosition.x,
          width: inputPosition.width,
          backgroundColor: themeColors.inputBackgroundColor,
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: 8,
          maxHeight: 300,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1000,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {suggestionsData.friends.length > 0 && (
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
                  Friends
                </Text>
              </View>
              {suggestionsData.friends.map((friend, index) => (
                <TouchableOpacity
                  key={friend._id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: index !== suggestionsData.friends.length - 1 || suggestionsData.nonFriends.length > 0 ? 1 : 0,
                    borderBottomColor: themeColors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => onSuggestionSelect(friend)}
                >
                  <View style={{ marginRight: 12 }}>
                    <DefaultProfilePicture
                      profilePicture={friend.profile_picture}
                      fullName={friend.full_name}
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
                      {friend.full_name}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: themeColors.placeholderTextColor 
                    }}>
                      @{friend.username}
                    </Text>
                  </View>
                  <Feather 
                    name="user-plus" 
                    size={16} 
                    color={themeColors.placeholderTextColor} 
                  />
                </TouchableOpacity>
              ))}
            </>
          )}
          
          {suggestionsData.nonFriends.length > 0 && (
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
              {suggestionsData.nonFriends.map((user, index) => (
                <TouchableOpacity
                  key={user._id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: index !== suggestionsData.nonFriends.length - 1 || suggestionsData.tags.length > 0 ? 1 : 0,
                    borderBottomColor: themeColors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => onSuggestionSelect(user)}
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
                    name="user-plus" 
                    size={16} 
                    color={themeColors.placeholderTextColor} 
                  />
                </TouchableOpacity>
              ))}
            </>
          )}
          
          {suggestionsData.tags.length > 0 && (
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
                  Tags
                </Text>
              </View>
              {suggestionsData.tags.map((tag, index) => (
                <TouchableOpacity
                  key={tag.activity_name}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: index !== suggestionsData.tags.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => onSuggestionSelect(tag)}
                >
                  <View style={{ 
                    marginRight: 12,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.inputBackgroundColor,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MaterialCommunityIcons 
                      name={getCategoryIcon(tag.activity_name)} 
                      size={24} 
                      color={getCategoryColor(tag.activity_name)} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontWeight: '600', 
                      fontSize: 16, 
                      color: themeColors.text 
                    }}>
                      {tag.activity_name}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: themeColors.placeholderTextColor 
                    }}>
                      {tag.friends.length} {tag.friends.length === 1 ? 'person' : 'people'}
                    </Text>
                  </View>
                  <Feather 
                    name="users" 
                    size={16} 
                    color={themeColors.placeholderTextColor} 
                  />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Portal>
  );
};

export default FriendSuggestionsDropdown;