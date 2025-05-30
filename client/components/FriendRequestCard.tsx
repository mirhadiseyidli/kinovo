import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { FriendRequestNotification } from '@/types/allTypes';

interface FriendRequestCardProps {
  request: FriendRequestNotification;
  onAccept?: (senderId: string) => void;
  onDecline?: (senderId: string) => void;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({ 
  request, 
  onAccept, 
  onDecline 
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const getStatusBadge = () => {
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

    // Show buttons for pending requests
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: '#10B981',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => onAccept?.(request.sender._id)}
        >
          <Feather name="check" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => onDecline?.(request.sender._id)}
        >
          <Feather name="x" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <View
      style={{
        padding: 16,
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* User Avatar */}
      <View style={{ marginRight: 12 }}>
        {request.sender.profile_picture ? (
          <Image
            source={{ uri: request.sender.profile_picture }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
            }}
          />
        ) : (
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: themeColors.tint,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              {request.sender.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ 
          color: themeColors.text, 
          fontSize: 16, 
          fontWeight: 'bold',
          marginBottom: 4
        }}>
          {request.sender.full_name}
        </Text>
        
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          fontSize: 14,
          marginBottom: 4
        }}>
          @{request.sender.username.length > 16 
                  ? request.sender.username.substring(0, 16) + '...' 
                  : request.sender.username}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 12 
          }}>
            {request.mutualFriendsCount} mutual friends
          </Text>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 12,
            marginLeft: 8
          }}>
            • {formatTime(request.created_at)}
          </Text>
        </View>
      </View>

      {/* Action Buttons or Status Badge */}
      {getStatusBadge()}
    </View>
  );
};

export default FriendRequestCard; 