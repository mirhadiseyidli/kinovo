import React, { useEffect, useState } from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

export default function KinovoSplash() {
  const [isVisible, setIsVisible] = useState(false);
  const { width, height } = Dimensions.get("window");
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    // Trigger animations on mount
    setIsVisible(true);
  }, []);

  return (
    <View
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <Animated.View 
        style={{
          alignItems: 'center', 
          marginBottom: 16,
          opacity: isVisible ? 1 : 0,
          transform: [{ scale: isVisible ? 1 : 0.8 }],
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: '500ms',
          transitionTimingFunction: 'ease-out',
        }}
      >
        <View style={{
          width: width * 0.45,
          height: width * 0.45,
          borderRadius: 24,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <Image
            source={require('@/assets/logo_2.png')}
            style={{ width: width * 0.45, height: width * 0.45, resizeMode: 'contain' }}
          />
        </View>
      </Animated.View>

      <Animated.View 
        style={{
          alignItems: 'center',
          opacity: isVisible ? 1 : 0,
          transform: [{ translateY: isVisible ? 0 : 10 }],
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: '500ms',
          transitionDelay: '500ms',
          transitionTimingFunction: 'ease-out',
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Helvetica Neue Bold',
            letterSpacing: -1,
            backgroundClip: 'text',
            color: themeColors.text,
          }}
        >
          Kinovo
        </Text>
      </Animated.View>
    </View>
  );
}
