import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { FriendRequestNotification } from '@/types/allTypes';
import { truncateName } from '@/utils/truncateName';
import DefaultProfilePicture from './DefaultProfilePicture';

interface FriendRequestCardProps {
  request: FriendRequestNotification;
  onAccept?: (senderId: string) => void;
  onDecline?: (senderId: string) => void;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = React.memo(({ 
  request, 
  onAccept, 
  onDecline 
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const getStatusBadge = useMemo(() => {
    if (request.status === 'accepted') {
      return (
        <View style={{
          backgroundColor: '#10B981',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Feather name="check" size={16} color="white" style={{ marginRight: 4 }} />
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            Accepted
          </Text>
        </View>
      );
    }
    
    if (request.status === 'rejected') {
      return (
        <View style={{
          backgroundColor: '#EF4444',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Feather name="x" size={16} color="white" style={{ marginRight: 4 }} />
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            Rejected
          </Text>
        </View>
      );
    }

    // Show buttons for pending requests - matching Manage Friends style
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{
            backgroundColor: themeColors.mountainGreen,
            borderRadius: 8,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => onAccept?.(request.sender._id)}
        >
          <Feather name="check" size={12} color={themeColors.text} />
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: themeColors.text, marginLeft: 4 }}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => onDecline?.(request.sender._id)}
        >
          <Feather name="x" size={12} color={themeColors.text} />
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: themeColors.text, marginLeft: 4 }}>Reject</Text>
        </TouchableOpacity>
      </View>
    );
  }, [request.status, themeColors.mountainGreen, themeColors.inputBackgroundColor, themeColors.text, onAccept, onDecline, request.sender._id]);

  const formattedTime = useMemo(() => {
    const date = new Date(request.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, [request.created_at]);

  return (
    <View
      style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* User Avatar */}
      <View style={{ marginRight: 12 }}>
        <DefaultProfilePicture
          profilePicture={request.sender.profile_picture}
          fullName={request.sender.full_name}
          size={50}
          borderRadius={25}
        />
      </View>

      {/* User Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ 
          color: themeColors.text, 
          fontSize: 16, 
          fontWeight: 'bold',
          marginBottom: 4
        }}>
          {truncateName(request.sender.full_name, 16)}
        </Text>
        
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          fontSize: 12,
          marginBottom: 4
        }}>
          {truncateName(request.sender.username, 18)}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 10 
          }}>
            {request.mutualFriendsCount} mutual friends
          </Text>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 10,
            marginLeft: 4
          }}>
            • {formattedTime}
          </Text>
        </View>
      </View>

      {/* Action Buttons or Status Badge */}
      {getStatusBadge}
    </View>
  );
});

FriendRequestCard.displayName = 'FriendRequestCard';

export default FriendRequestCard; 