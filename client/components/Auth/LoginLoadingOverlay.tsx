import React, { useEffect } from 'react';
import { View, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  runOnJS,
  Easing 
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

interface LoginLoadingOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  onAnimationComplete?: () => void;
}

const LoginLoadingOverlay: React.FC<LoginLoadingOverlayProps> = ({ 
  visible, 
  isSuccess, 
  onAnimationComplete 
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const overlayOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Show overlay
      overlayOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Hide overlay
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    if (isSuccess && visible) {
      // Hide loading indicator
      loadingOpacity.value = withTiming(0, { duration: 150 });
      
      // Show and animate checkmark
      checkmarkOpacity.value = withTiming(1, { duration: 150 });
      checkmarkScale.value = withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 800 }), // Hold for a moment
        withTiming(0, { duration: 200 }, () => {
          if (onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
    }
  }, [isSuccess, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        },
        overlayStyle
      ]}
    >
      {/* Loading Indicator */}
      <Animated.View style={[loadingStyle]}>
        <ActivityIndicator 
          size="large" 
          color={themeColors.mountainGreen} 
        />
      </Animated.View>

      {/* Success Checkmark */}
      <Animated.View 
        style={[
          {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.mountainGreen,
            borderRadius: 35,
            width: 70,
            height: 70,
          },
          checkmarkStyle
        ]}
      >
        <Feather name="check" size={40} color="white" />
      </Animated.View>
    </Animated.View>
  );
};

export default LoginLoadingOverlay; 