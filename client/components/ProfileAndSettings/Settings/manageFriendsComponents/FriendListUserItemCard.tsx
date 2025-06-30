import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Router, useRouter } from 'expo-router';
import { FriendListUserItemCardProps } from '@/types/allTypes';
import DefaultProfilePicture from '../../../DefaultProfilePicture';

export default function FriendListUserItemCard({
  _id,
  name,
  subtitle,
  mutualFriendsNumber,
  avatarUri,
  onAdd,
  style
}: FriendListUserItemCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const router = useRouter();

  const handleAddFriendPress = async () => {
    setIsLoading(true);
    const start = Date.now();
    try {
      await onAdd?.();
      const elapsed = Date.now() - start;
      const remaining = Math.max(1000 - elapsed, 0);
      setTimeout(() => {
        setRequestSent(true);
        setIsLoading(false);
      }, remaining);
    } catch (error) {
      console.error('Error sending request:', error);
      setIsLoading(false);
    }
  };

  const openUserProfile = (_id: string) => {
    router.push(`/(auth)/profile/${encodeURIComponent(_id)}?modal=true`);
  };

  return (
    <TouchableOpacity 
      onPress={() => openUserProfile(_id)}
      style={[
        {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 190,
          height: 240,
          backgroundColor: themeColors.inputBackgroundColor,
          paddingVertical: 24,
          paddingHorizontal: 24,
          borderRadius: 8,
          gap: 8,
        },
        style
      ]}
    >
      <View style={{ flexDirection: 'column', alignItems: 'center', flex: 1, gap: 8 }}>
        <DefaultProfilePicture
          profilePicture={avatarUri}
          fullName={name}
          size={88}
          borderRadius={44}
        />
        <View style={{ flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{name}</Text>
          {subtitle && <Text style={{ color: themeColors.placeholderTextColor }}>{subtitle}</Text>}
          {mutualFriendsNumber > 0 && (
            <Text style={{ color: themeColors.placeholderTextColor }}>
              {mutualFriendsNumber} {mutualFriendsNumber === 1 ? 'mutual friend' : 'mutual friends'}
            </Text>
          )}
        </View>
      </View>
      {requestSent ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="check" size={20} color={themeColors.mountainGreen} />
            <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Request sent!</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleAddFriendPress}
            disabled={isLoading}
            style={{
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <View style={{ justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              {isLoading ? (
                <View style={{ transform: [{ scale: 0.75 }] }}>
                  <ActivityIndicator size="small" color={themeColors.text} />
                </View>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>Add Friend</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
    </TouchableOpacity>
  );
}