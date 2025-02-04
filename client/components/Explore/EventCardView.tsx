import React from 'react';
import { View, ImageBackground, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';

interface SuggestedEventProps {
  title: string;
  location: string;
  date: string;
  time: string;
  imageUrl: any;
}

const EventCardView: React.FC<SuggestedEventProps> = ({
  title,
  location,
  date,
  time,
  imageUrl,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();

  const backgroundColor =
    colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.6)' : 'rgba(200, 200, 200, 0.6)';

  return (
    <ImageBackground
      source={imageUrl}
      resizeMode="cover"
      style={{
        width: screenWidth * 0.9,
        borderRadius: 16,
        overflow: 'hidden',
        aspectRatio: 1.9,
        alignSelf: 'center',
        marginVertical: 8,
      }}
    >
      {/* Blurry Overlay */}
      <BlurView
        intensity={50}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={{
          backgroundColor,
          width: '100%',
          position: 'absolute',
          bottom: 0,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        }}
      >
        {/* Event Details */}
        <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>{title}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Feather name="map-pin" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>{location}</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="clock" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
          <ThemedText style={{ fontSize: 12, marginLeft: 6 }}>{date} • {time}</ThemedText>
        </View>
      </BlurView>
    </ImageBackground>
  );
};

export default EventCardView;