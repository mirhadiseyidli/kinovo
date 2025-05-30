import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { Event, User } from '@/types/allTypes';
import { LinearGradient } from 'expo-linear-gradient';

const PastEvent: React.FC<{ event: Event; loading: boolean }> = ({ event, loading }) => {
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
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >

      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 12,
          opacity: 0.9, // Slight transparency for a sleeker look
        }}
      />

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
              paddingVertical: 6,
              borderRadius: 4,
              backgroundColor: themeColors.background,
            }}
          >
            <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
              {event.category?.toLowerCase() || 'Other'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{ flexDirection: 'column', gap: 8 }}>
          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="calendar" size={16} color={themeColors.textThird} />
            <Text style={{ color: themeColors.textThird, fontSize: 14 }}>
              {event.start_time
                ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Date not available'}
            </Text>
          </View>

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={16} color={themeColors.textThird} />
            <Text style={{ color: themeColors.textThird, fontSize: 14 }}>
              {truncateText(event?.location.text || '', 25)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Avatars */}
          {Array.isArray(event.attendees) && (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {event.attendees.slice(0, 3).map((user, i) => (
                <Image
                  key={user.user?._id}
                  source={user.user?.profile_picture ? { uri: user.user?.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    marginLeft: i === 0 ? 0 : -12,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PastEvent;

// onPress={handleViewEvent}