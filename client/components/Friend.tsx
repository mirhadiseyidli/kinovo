import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface FriendProps {
  name: string;
  image: any;
  eventCount?: number;
  size?: number;
  showName?: boolean;
}

const Friend: React.FC<FriendProps> = ({ name, image, eventCount = 0, size, showName }) => {
  const screenWidth = Dimensions.get('window').width;
  const defaultSize = screenWidth * 0.18; // Default: 18% of screen width
  const imageSize = size || defaultSize; // Use provided size or default
  const badgeSize = imageSize * 0.3; // Badge size relative to the image

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Friend Image with Event Count Badge */}
      <View
        style={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          width: imageSize,
          height: imageSize,
          backgroundColor: 'transparent',
          borderRadius: imageSize / 2,
          borderWidth: eventCount > 0 ? 2 : 0,
          borderColor: eventCount > 0 ? '#22c55e' : 'transparent'
        }}
      >
        <Image
          source={image}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: imageSize / 2,
          }}
          resizeMode="cover"
        />

        {/* Event Count Badge */}
        {eventCount > 0 && (
          <View
            style={{
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              position: 'absolute',
              bottom: -badgeSize * 0.15,
              right: -badgeSize * 0.15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1,
              elevation: 3, // Adds shadow for Android
              backgroundColor: '#22c55e',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
              {eventCount}
            </Text>
          </View>
        )}
      </View>

      {/* Friend Name with Truncation */}
      {showName && (
        <ThemedText
          style={{
            fontSize: 10,
            textAlign: 'center',
            maxWidth: imageSize * 1.2, // Restrict width for truncation
            marginTop: 4
          }}
        >
          {truncateName(name, 10)}
        </ThemedText>
      )}
    </View>
  );
};

export default Friend;