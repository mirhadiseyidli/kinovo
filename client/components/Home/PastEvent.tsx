import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { Event, User } from '@/types/allTypes';
import { LinearGradient } from 'expo-linear-gradient';
import DefaultProfilePicture from '../DefaultProfilePicture';

const PastEvent: React.FC<{ event: Event; loading: boolean }> = React.memo(({ event, loading }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  const handleViewEvent = () => {
    router.push(`/(auth)/(viewEvent)/${event?._id}`);
  }

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      onPress={handleViewEvent}
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: themeColors.eventCardBackgroundColor,
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      <View style={{ flexDirection: 'column' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }}>
            {event.title}
          </Text>
          {/* Category pill */}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: themeColors.mountainGreen,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
              {event.category?.toLowerCase() || 'Other'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{ flexDirection: 'column', gap: 8 }}>
          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="calendar" size={16} color={themeColors.textSecondary} />
            <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>
              {event.start_time
                ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Date not available'}
            </Text>
          </View>

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={16} color={themeColors.textSecondary} />
            <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>
              {truncateText(event?.location.text || 'Location TBD', 25)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Avatars */}
          {Array.isArray(event.attendees) && (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {event.attendees.slice(0, 3).map((user, i) => (
                <View
                  key={user.user?._id}
                  style={{
                    marginLeft: i === 0 ? 0 : -12,
                  }}
                >
                  <DefaultProfilePicture
                    profilePicture={user.user?.profile_picture}
                    fullName={user.user?.full_name}
                    size={36}
                    borderRadius={18}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

PastEvent.displayName = 'PastEvent';

export default PastEvent;

// onPress={handleViewEvent}