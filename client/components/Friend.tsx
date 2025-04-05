import React from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { FriendProps } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

const Friend: React.FC<FriendProps & { refreshing: boolean }> = ({ full_name, profile_picture, eventCount = 0, size, showName, refreshing, activityData }) => {
  const screenWidth = Dimensions.get('window').width;
  const defaultSize = screenWidth * 0.18; // Default: 18% of screen width
  const imageSize = size || defaultSize; // Use provided size or default
  const badgeSize = imageSize * 0.3; // Badge size relative to the image
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const truncateName = (full_name: string | undefined, maxLength: number) => {
    if (!full_name) return '';
    return full_name.length > maxLength ? `${full_name.substring(0, maxLength)}...` : full_name;
  };

  return (
    <TouchableOpacity style={{ alignItems: 'center' }}>
      <AutoSkeletonView 
        isLoading={refreshing} 
        shimmerBackgroundColor={themeColors.background} 
        gradientColors={[
          themeColors.background, 
          themeColors.inputBackgroundColor
        ]}
      >
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
            borderColor: eventCount > 0 ? themeColors.mountainGreen : 'transparent'
          }}
        >
          <Image
            source={
              profile_picture
                ? { uri: profile_picture }
                : require('../assets/profile-pic-2.jpeg')
            }
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
                backgroundColor: themeColors.mountainGreen,
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
              marginTop: 4,
            }}
          >
            {truncateName(full_name, 9)}
          </ThemedText>
        )}
      </AutoSkeletonView>
    </TouchableOpacity>
  );
};

export default Friend;