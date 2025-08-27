import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { Event } from '@/types/allTypes';
import { LinearGradient } from 'expo-linear-gradient';
import DefaultProfilePicture from '../DefaultProfilePicture';
import { getCategoryImage } from '@/constants/CategoryImages';
import { SkeletonBox } from '../Skeleton';
import { ImageBackground } from 'expo-image';
import { truncateName } from '@/utils/truncateName';

const PastEvent: React.FC<{ event: Event; loading: boolean }> = React.memo(({ event, loading }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  
  // Early return if event is empty or missing required fields
  if (!event || !event._id || !event.title || !event.start_time || !event.location) {
    return null;
  }
  
  const handleViewEvent = () => {
    // Check if this is a compound ID with date suffix (e.g., "id-2025-09-01")
    const idParts = event?._id?.split('-');
    const hasDateSuffix = idParts && idParts.length >= 4 && 
                          idParts[idParts.length - 3].length === 4 && // year
                          idParts[idParts.length - 2].length === 2 && // month
                          idParts[idParts.length - 1].length === 2;   // day
    
    if (hasDateSuffix) {
      // Extract base event ID
      const baseEventId = idParts.slice(0, -3).join('-');
      
      // Use the start_time and end_time from the event data for the occurrence
      router.push({
        pathname: "/(auth)/viewEvent/[event_id]" as const,
        params: {
          event_id: baseEventId,
          occurrence_start: event.start_time?.toString() || '',
          occurrence_end: event.end_time?.toString() || '',
          is_occurrence: 'true'
        }
      });
    } else {
      // Regular event without occurrence
      router.push(`/(auth)/viewEvent/${event?._id}`);
    }
  }

  return (
    <TouchableOpacity onPress={handleViewEvent}>
      <ImageBackground
        source={getCategoryImage(event.category)}
        style={{
          padding: 16,
          borderRadius: 12,
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden',
          backgroundColor: themeColors.eventCardBackgroundColor,
        }}
        contentFit="cover"
        onError={() => {
          return <SkeletonBox width={400} height={120} borderRadius={12} />;
        }}
        onProgress={() => {
          return <SkeletonBox width={400} height={120} borderRadius={12} />;
        }}
        cachePolicy="disk"
        allowDownscaling={true}
        imageStyle={{
          bottom: -160,
        }}
      >
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[themeColors.pastEventGradientOne, themeColors.pastEventGradientTwo]}
            style={{ flex: 1 }}
          />
        </View>

        {/* Title */}
        <View style={{ flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              {truncateName(event.title || 'Title Error', 20)}
            </Text>
            {/* Category pill */}
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: themeColors.eventCardCategoryColor,
                borderWidth: 1,
                borderColor: themeColors.eventCardCategoryBorderColor,
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
                {truncateName(event?.location.text || 'Location TBD', 25)}
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
      </ImageBackground>
    </TouchableOpacity>
  );
});

PastEvent.displayName = 'PastEvent';

export default PastEvent;