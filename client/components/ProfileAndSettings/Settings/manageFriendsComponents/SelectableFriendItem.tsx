import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

interface SelectableFriendItemProps {
  _id: string;
  name: string;
  username: string;
  avatarUri?: string;
  onSelect?: () => void;
  rightIcon?: 'plus' | 'x' | null;
  isSelected?: boolean;
  disabled?: boolean;
}

const SelectableFriendItem: React.FC<SelectableFriendItemProps> = ({
  name,
  username,
  avatarUri,
  onSelect,
  rightIcon,
  isSelected,
  disabled
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={disabled}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: isSelected ? themeColors.mountainGreen + '20' : 'transparent',
        opacity: disabled ? 0.7 : 1
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Image
          source={avatarUri ? { uri: avatarUri } : require('@/assets/profile-pic-2.jpeg')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
          }}
        />
        <View style={{
          flex: 1,
          marginLeft: 12,
          justifyContent: 'center',
        }}>
          <ThemedText 
            style={{
              fontSize: 16,
              fontWeight: '600',
            }} 
            numberOfLines={1}
          >
            {name}
          </ThemedText>
          <ThemedText 
            style={{
              fontSize: 14,
              marginTop: 2,
              color: themeColors.textSecondary,
            }} 
            numberOfLines={1}
          >
            @{username}
          </ThemedText>
        </View>
        {rightIcon && (
          <Feather 
            name={rightIcon} 
            size={20} 
            color={rightIcon === 'plus' ? themeColors.mountainGreen : themeColors.text} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default SelectableFriendItem; 