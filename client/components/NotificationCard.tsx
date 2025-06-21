import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NotificationCardProps } from '@/types/allTypes';

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onPress, isMarking = false }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const getNotificationIcon = () => {
    if (isMarking) {
      return <ActivityIndicator size="small" color="white" />;
    }

    switch (notification.type) {
      case 'friend_request':
        return <Feather name="user-plus" size={20} color="white" />;
      case 'friend_request_accepted':
        return <Feather name="user-check" size={20} color="white" />;
      case 'event_created':
        return <Feather name="plus-circle" size={20} color="white" />;
      case 'event_attendance_confirmed':
        return <Feather name="check" size={20} color="white" />;
      case 'new_event_nearby':
        return <Ionicons name="location-outline" size={20} color="white" />;
      case 'event_reminder':
        return <Feather name="clock" size={20} color="white" />;
      case 'event_updated':
        return <Feather name="calendar" size={20} color="white" />;
      case 'event_liked':
        return <Feather name="heart" size={20} color="white" />;
      case 'new_comment':
        return <Feather name="message-circle" size={20} color="white" />;
      case 'someone_joined':
        return <Feather name="users" size={20} color="white" />;
      default:
        return <Feather name="bell" size={20} color="white" />;
    }
  };

  const getIconBackgroundColor = () => {
    switch (notification.type) {
      case 'friend_request':
        return themeColors.tint;
      case 'friend_request_accepted':
        return themeColors.mountainGreen;
      case 'event_created':
        return '#8B5CF6';
      case 'event_attendance_confirmed':
        return themeColors.mountainGreen;
      case 'new_event_nearby':
        return themeColors.tint;
      case 'event_reminder':
        return '#FF8C00';
      case 'event_updated':
        return '#8B5CF6';
      case 'event_liked':
        return '#EF4444';
      case 'new_comment':
        return themeColors.tint;
      case 'someone_joined':
        return themeColors.tint;
      default:
        return themeColors.tint;
    }
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

  const displayTime = notification.time || formatTime(notification.created_at);

  console.log('NotificationCard', {
    title: notification.title,
    subtitle: notification.subtitle,
    type: notification.type,
  });

  return (
    <TouchableOpacity
      style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        opacity: notification.is_seen || isMarking ? 0.7 : 1.0, // Dim seen notifications or marking notifications
        borderLeftWidth: notification.is_seen ? 0 : 3,
        borderLeftColor: notification.is_seen ? 'transparent' : themeColors.tint, // Unseen indicator
      }}
      onPress={onPress}
      activeOpacity={isMarking ? 1 : 0.7} // Prevent touch when marking
      disabled={isMarking} // Disable when marking
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: getIconBackgroundColor(),
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        {getNotificationIcon()}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ 
                color: themeColors.text, 
                fontSize: 16, 
                fontWeight: 'bold',
                flex: 1
              }}>
                {notification.title}
              </Text>
              {/* Unseen dot indicator */}
              {!notification.is_seen && !isMarking && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: themeColors.tint,
                    marginLeft: 8,
                  }}
                />
              )}
            </View>
            
            {notification.subtitle && (
              <Text style={{ 
                color: themeColors.text, 
                fontSize: 14, 
                marginBottom: 4,
                opacity: notification.is_seen ? 0.8 : 1.0
              }}>
                {notification.subtitle}
              </Text>
            )}
            
            <Text style={{ 
              color: themeColors.placeholderTextColor, 
              fontSize: 12, 
              marginBottom: 8 
            }}>
              {displayTime}
            </Text>
          </View>

          {/* Count Badge */}
          {notification.count && notification.count > 0 && (
            <View
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                {notification.count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default NotificationCard; 