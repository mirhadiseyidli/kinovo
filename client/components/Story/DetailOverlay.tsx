import React from 'react';
import { View, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import type { ImageColorsResult } from 'react-native-image-colors';
import type { Router } from 'expo-router';

type DetailOverlayProps = {
  bounceAnim: Animated.Value;
  content: { event: any }[];
  current: number;
  themeColors: { text: string };
  router: Router;
  pause: () => void;
};

const DetailOverlay: React.FC<DetailOverlayProps> = ({
  bounceAnim,
  content,
  current,
  themeColors,
  router,
  pause,
}) => {
  return (
    <TouchableWithoutFeedback
      onPress={() => {
        const eventId = content[current]?.event?._id;
        if (eventId) {
          pause();
          setTimeout(() => {
            router.push({
              pathname: "/(auth)/(viewEvent)/[event_id]" as const,
              params: {
                event_id: eventId,
                fromStory: "true",
                timestamp: Date.now()
              }
            });
          }, 50);
        };
      }}
    >
      <View
        style={{
          paddingVertical: 24,
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 200,
        }}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [{ translateY: bounceAnim }],
          }}
        >
          <Ionicons name="chevron-up" size={20} color={themeColors.text} />
        </Animated.View>
        <ThemedText>Click here for details</ThemedText>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default DetailOverlay;