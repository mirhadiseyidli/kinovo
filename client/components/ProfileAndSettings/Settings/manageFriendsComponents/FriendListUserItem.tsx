import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { FriendListUserItemProps } from '@/types/allTypes';
import { ThemedText } from '@/components/ThemedText';
import { useManageFriends } from '@/hooks/useManageFriends';
import { useFocusEffect } from '@react-navigation/native';
import { ContextMenu } from '@expo/ui/swift-ui';
import { Button } from '@expo/ui/swift-ui';
import api from '@/utils/api';
import DefaultProfilePicture from '../../../DefaultProfilePicture';

export default function FriendListUserItem({
  _id,
  name,
  subtitle,
  avatarUri,
  status,
  mutualFriendsCount,
  onAdd,
  onRemove,
  onInvite,
  onEdit
}: FriendListUserItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null);
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const { 
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriendFromFriendList
    } = useManageFriends();

  const openUserProfile = (_id: string) => {
    router.push({
      pathname: "/(auth)/(profile)/[_id]",
      params: { _id }
    });
  }

  const truncateName = (name: string, maxLength: number) => {
    if (!name) return '';
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  const handleAccept = async () => {
    setLoading('accept');
    await acceptFriendRequest(_id);
    setIsWaiting(true);
    setDecision('accepted');
  };
  
  const handleReject = async () => {
    setLoading('reject');
    await rejectFriendRequest(_id);
    setIsWaiting(true);
    setDecision('rejected');
  };

  useFocusEffect(
    useCallback(() => {
      if (isWaiting) {
        const timeout = setTimeout(() => {
          setLoading(null);
          setIsWaiting(false);
        }, 1000);

        return () => clearTimeout(timeout);
      }
    }, [isWaiting])
  );

  const handleBlockUser = async () => {
    try {
      await api.post('/api/users/block', { userId: _id });
      Alert.alert('Success', 'User has been blocked');
      onRemove?.();
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const showBlockUserConfirmation = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will be removed from your friends list and won\'t be able to interact with you.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: handleBlockUser
        }
      ]
    );
  };

  const showRemoveFriendConfirmation = () => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend from your friends list?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
          await removeFriendFromFriendList(_id);
          onRemove?.();
          }
        }
      ]
    );
  };

  const renderAction = () => {
    switch (status) {
      case 'onKinovo':
        return (
          <TouchableOpacity 
            style={{
              backgroundColor: themeColors.inputBackgroundColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
            onPress={onAdd}
          >
            <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Add Friend</Text>
          </TouchableOpacity>
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
      case 'manageFriend':
        return (
          <ContextMenu 
            activationMethod='singlePress'
            style={{ 
              height: 34,
              width: 40,
            }}
          >
            <ContextMenu.Items>
              <Button 
                systemImage={"person.badge.minus"} 
                onPress={showRemoveFriendConfirmation}
                children='Remove Friend'
                role='destructive'
              />
              <Button 
                systemImage={"exclamationmark.triangle"} 
                onPress={showBlockUserConfirmation}
                children='Block User'
                role='destructive'
              />
            </ContextMenu.Items>

            <ContextMenu.Trigger>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 10,
                borderRadius: 8,
                width: 40,
                alignItems: 'center',
              }}>
                <Feather name="more-horizontal" size={24} color={themeColors.text} />
              </View>
            </ContextMenu.Trigger>
          </ContextMenu>
        );
        case 'manageTagFriend':
          return;
      case 'request': {
        if (decision === 'accepted') {
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={20} color={themeColors.mountainGreen} />
              <Text style={{ marginLeft: 6, color: themeColors.mountainGreen }}>Accepted</Text>
            </View>
          );
        }
      
        if (decision === 'rejected') {
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close-circle" size={20} color="red" />
              <Text style={{ marginLeft: 6, color: 'red' }}>Rejected</Text>
            </View>
          );
        }
      
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleAccept}
            disabled={loading !== null}
            style={{
              backgroundColor: themeColors.mountainGreen,
              borderRadius: 8,
              padding: 8,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading === 'accept' ? (
              <ActivityIndicator size="small" color={themeColors.text} />
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <Ionicons name="checkmark" size={14} color={themeColors.text} />
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>Accept</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReject}
            disabled={loading !== null}
            style={{
              backgroundColor: themeColors.inputBackgroundColor,
              borderRadius: 8,
              padding: 8,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading === 'reject' ? (
              <ActivityIndicator size="small" color={themeColors.text} />
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <Ionicons name="close" size={14} color={themeColors.text} />
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>Reject</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
        );
      }
      default:
        return null;
    }
  };

  return status === 'invite' ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ marginRight: 12 }}>
            <DefaultProfilePicture
              profilePicture={avatarUri}
              fullName={name}
              size={48}
              borderRadius={24}
          />
          </View>
          <View style={{ flexDirection: 'column'}}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{truncateName(name, 16)}</Text>
            </View>
            {subtitle && <Text style={{ color: themeColors.placeholderTextColor, marginTop: 2 }}>{truncateName(subtitle, 16)}</Text>}
          </View>
        </View>
        {renderAction()}
      </View>
    ) : (
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
          <View style={{ marginRight: 12 }}>
            <DefaultProfilePicture
              profilePicture={avatarUri}
              fullName={name}
              size={48}
              borderRadius={24}
          />
          </View>
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
            <View style={{ flexDirection: 'column', gap: 2 }}>
              {subtitle && <Text style={{ color: themeColors.placeholderTextColor }}>{truncateName(subtitle, 16)}</Text>}
              {typeof mutualFriendsCount === 'number' && mutualFriendsCount > 0 && (
                <Text style={{ color: themeColors.placeholderTextColor, fontSize: 12 }}>
                  {mutualFriendsCount} {mutualFriendsCount === 1 ? 'mutual friend' : 'mutual friends'}
                </Text>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
          }} 
          style={{ 
            zIndex: 1
          }}
        >
          {renderAction()}
        </TouchableOpacity>
      </TouchableOpacity>
  );
}