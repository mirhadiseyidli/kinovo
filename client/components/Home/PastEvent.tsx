import React from 'react';
import { View, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur'; // Add expo-blur for the blur effect
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';
import { Event } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

const PastEvent: React.FC<{ event: Event; loading: boolean }> = ({ event, loading }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Background color based on theme
  const backgroundColor =
    colorScheme === 'dark'
      ? 'rgba(50, 50, 50, 0.7)' // Whitish gray for dark mode
      : 'rgba(200, 200, 200, 0.7)'; // Darkish gray for light mode

  return (
    <TouchableOpacity>
      <AutoSkeletonView 
        isLoading={loading} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
        <ImageBackground
          source={event?.event_picture ? { uri: event.event_picture } : require('@/assets/event-default.png')}
          resizeMode="cover"
          style={{
            backgroundColor: themeColors.background,
            width: '100%',
            aspectRatio: 1.9,
            borderRadius: 12, // Ensure rounded corners
            overflow: 'hidden',
            marginBottom: 8
          }}
        >
          {/* Blurry Tint Overlay */}
          <BlurView
            intensity={50}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={{
              backgroundColor,
              width: '100%',
              height: '30%',
              position: 'absolute',
              bottom: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
            }}
          >
            {/* Event Info */}
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{event.title}</ThemedText>
              <ThemedText style={{ fontSize: 12 }}>
                {event?.start_time ? new Date(event.start_time).toISOString().split('T')[0] : 'No date'}
              </ThemedText>
            </View>

            {/* Attendees */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {event?.attendees?.slice(0, 3).map((friend, index) => (
                <View key={index} style={{ marginLeft: index > 0 ? -12 : 0 }}>
                  <Friend _id={friend._id} full_name={friend.full_name} profile_picture={friend.profile_picture} size={32} refreshing={loading}/>
                </View>
              ))}
            </View>
          </BlurView>
        </ImageBackground>
      </AutoSkeletonView>
    </TouchableOpacity>
  );
};

export default PastEvent;