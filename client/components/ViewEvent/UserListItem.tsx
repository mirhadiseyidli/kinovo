import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import DefaultProfilePicture from '../DefaultProfilePicture';

interface UserListItemProps {
  _id: string;
  name: string;
  username?: string;
  avatarUri?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  showUsername?: boolean;
  disableNavigation?: boolean;
}

const AVATAR_SIZES = {
  small: 36,
  medium: 48,
  large: 56,
};

const NAME_SIZES = {
  small: 14,
  medium: 16,
  large: 18,
};

export const UserListItem: React.FC<UserListItemProps> = ({
  _id,
  name,
  username,
  avatarUri,
  onPress,
  rightElement,
  size = 'medium',
  showUsername = true,
  disableNavigation = false,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  const avatarSize = AVATAR_SIZES[size];
  const nameSize = NAME_SIZES[size];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!disableNavigation) {
      router.replace(`/(auth)/(profile)/${encodeURIComponent(_id)}`);
    }
  };

  const truncateName = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress && disableNavigation}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{ marginRight: 12 }}>
          <DefaultProfilePicture
            profilePicture={avatarUri}
            fullName={name}
            size={avatarSize}
            borderRadius={avatarSize / 2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText 
            style={{ 
              fontSize: nameSize,
              fontWeight: '600',
              marginBottom: showUsername && username ? 2 : 0,
            }}
            numberOfLines={1}
          >
            {truncateName(name, 25)}
          </ThemedText>
          {showUsername && username && (
            <ThemedText 
              style={{ 
                fontSize: nameSize - 2,
                color: themeColors.textSecondary,
              }}
              numberOfLines={1}
            >
              @{username}
            </ThemedText>
          )}
        </View>
      </View>
      {rightElement && (
        <View style={{ marginLeft: 8 }}>
          {rightElement}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default UserListItem; 