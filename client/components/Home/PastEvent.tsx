import React from 'react';
import { View, ImageBackground, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur'; // Add expo-blur for the blur effect
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import Friend from '@/components/Friend';

interface PastEventProps {
  title: string;
  date: string;
  attendees: { name: string; image: any; eventCount: number }[];
  image: any;
}

const PastEvent: React.FC<PastEventProps> = ({ title, date, attendees, image }) => {
  const colorScheme = useColorScheme(); // Get current color scheme
  const screenWidth = Dimensions.get('window').width;
  const defaultSize = screenWidth * 0.18; // Default: 18% of screen width

  // Background color based on theme
  const backgroundColor =
    colorScheme === 'dark'
      ? 'rgba(50, 50, 50, 0.7)' // Whitish gray for dark mode
      : 'rgba(200, 200, 200, 0.7)'; // Darkish gray for light mode

  return (
    <ImageBackground
      source={image}
      resizeMode="cover"
      style={{
        width: '100%',
        height: 160, // Fixed height
        borderRadius: 12, // Ensure rounded corners
        overflow: 'hidden',
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
          <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{title}</ThemedText>
          <ThemedText style={{ fontSize: 12 }}>{date}</ThemedText>
        </View>

        {/* Attendees */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {attendees.slice(0, 3).map((friend, index) => (
            <View key={index} style={{ marginLeft: index > 0 ? -12 : 0 }}>
              <Friend name={friend.name} image={friend.image} eventCount={friend.eventCount} size={32} />
            </View>
          ))}
        </View>
      </BlurView>
    </ImageBackground>
  );
};

export default PastEvent;