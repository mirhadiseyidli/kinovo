import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export default function KinovoSplash() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const subtitleDelay = 1000;
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withTiming(1, { duration: 500 });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    subtitleOpacity.value = withDelay(subtitleDelay, withTiming(0.7, { duration: 500 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textOpacity.value * -10 }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <Animated.View style={[{ alignItems: 'center', marginBottom: 16 }, logoStyle]}>
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

      <Animated.View style={[{ alignItems: 'center' }, textStyle]}>
        <Text
          style={{
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Helvetica Neue Bold',
            letterSpacing: -1,
            backgroundClip: 'text',
            color: 'white',
          }}
        >
          Kinovo
        </Text>
      </Animated.View>
    </View>
  );
}
