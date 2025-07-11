import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { Event } from '@/types/allTypes';
import { LinearGradient } from 'expo-linear-gradient';
import DefaultProfilePicture from '../DefaultProfilePicture';
import OptimizedImageBackground from '../OptimizedImageBackground';

const PastEvent: React.FC<{ event: Event; loading: boolean }> = React.memo(({ event, loading }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  const handleViewEvent = () => {
    router.push(`/(auth)/viewEvent/${event?._id}`);
  }

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity onPress={handleViewEvent}>
      <OptimizedImageBackground
        source={event.event_picture || null}
        fallbackCategory={event.category}
        width={400}
        height={200}
        quality={50}
        style={{
          padding: 16,
          borderRadius: 12,
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden',
          backgroundColor: themeColors.eventCardBackgroundColor,
        }}
        resizeMode="cover"
        imageStyle={{
          bottom: -160,
        }}
      >
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={{ flex: 1 }}
          />
        </View>

        {/* Title */}
        <View style={{ flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 }}>
              {event.title}
            </Text>
            {/* Category pill */}
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
                {event.category || 'Other'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            {/* Date */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="calendar" size={16} color={'white'} />
              <Text style={{ color: 'white', fontSize: 14 }}>
                {event.start_time
                  ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Date not available'}
              </Text>
            </View>

            {/* Location */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="map-pin" size={16} color={'white'} />
              <Text style={{ color: 'white', fontSize: 14 }}>
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
      </OptimizedImageBackground>
    </TouchableOpacity>
  );
});

PastEvent.displayName = 'PastEvent';

export default PastEvent;