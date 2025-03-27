import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { FriendListUserItemProps } from '@/types/allTypes';

export default function FriendListUserItem({
  _id,
  name,
  subtitle,
  avatarUri,
  status,
  onAdd,
  onRemove,
  onInvite,
  onEdit
}: FriendListUserItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  const openUserProfile = (_id: string) => {
    router.replace(`/(auth)/(tabs)/(profile)/${encodeURIComponent(_id)}`);
  }

  const renderAction = () => {
    switch (status) {
      case 'onKinovo':
        return (
          <View style={{
            backgroundColor: themeColors.inputBackgroundColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}>
            <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Add Friend</Text>
          </View>
        );
      case 'invite':
        return (
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.inputBackgroundColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
            onPress={onInvite}
          >
            <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Invite</Text>
          </TouchableOpacity>
        );
      case 'request':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={onAdd}
              style={{
                backgroundColor: '#6EE7B7',
                borderRadius: 999,
                padding: 8,
                marginRight: 8,
              }}
            >
              <Ionicons name="checkmark" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRemove}
              style={{
                backgroundColor: '#2A2D36',
                borderRadius: 999,
                padding: 8,
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      case 'manageFriend':
        return (
          <TouchableOpacity
            onPress={onEdit}
          >
            <Feather name="more-horizontal" size={20} color={themeColors.text} />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity 
      onPress={() => openUserProfile(_id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Image
          source={avatarUri ? { uri: avatarUri } : require('@/assets/profile-pic-2.jpeg')}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            marginRight: 12,
          }}
        />
        <View style={{ flexDirection: 'column'}}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{name}</Text>
            {status === 'onKinovo' && (
              <View style={{
                backgroundColor: themeColors.mountainGreen,
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                marginLeft: 4,
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 8, color: themeColors.text, fontWeight: 'bold' }}>onKinovo</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={{ color: themeColors.placeholderTextColor, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {renderAction()}
    </TouchableOpacity>
  );
}