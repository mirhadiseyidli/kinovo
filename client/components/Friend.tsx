import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { FriendProps } from '@/types/allTypes';
import StoryViewer from '@/components/Story/StoryViewer';

const Friend: React.FC<FriendProps & { refreshing: boolean, onPress?: () => void }> = ({ _id, full_name, profile_picture, eventCount = 0, size, showName, refreshing, activityData, onPress }) => {
  const screenWidth = Dimensions.get('window').width;
  const defaultSize = screenWidth * 0.18; // Default: 18% of screen width
  const imageSize = size || defaultSize; // Use provided size or default
  const badgeSize = imageSize * 0.3; // Badge size relative to the image
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [startPosition, setStartPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [loading, setLoading] = useState(false);
  const imageRef = useRef<View>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const truncateName = (full_name: string | undefined, maxLength: number) => {
    if (!full_name) return '';
    return full_name.length > maxLength ? `${full_name.substring(0, maxLength)}...` : full_name;
  };

  const handlePress = () => {
    if (eventCount === 0 || !mountedRef.current) return;
    
    setLoading(true);
    
    // Call original onPress first to set Redux data
    if (onPress) {
      onPress();
    }

    // Measure the position of the friend circle
    imageRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (!mountedRef.current) return;
      
      setStartPosition({
        x: pageX,
        y: pageY,
        width,
        height,
      });
      
      // Show story viewer with a small delay to ensure Redux data is set
      setTimeout(() => {
        if (mountedRef.current) {
          setStoryViewerVisible(true);
        }
      }, 100);
    });
  };

  const handleCloseStoryViewer = () => {
    if (mountedRef.current) {
      setStoryViewerVisible(false);
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={{ alignItems: 'center' }}
        onPress={handlePress}
      >
        {/* Friend Image with Event Count Badge */}
        <View
          ref={imageRef}
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
      </TouchableOpacity>

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={storyViewerVisible}
        friendId={_id || ''}
        startPosition={startPosition}
        onClose={handleCloseStoryViewer}
        loading={loading}
      />
    </>
  );
};

export default Friend;