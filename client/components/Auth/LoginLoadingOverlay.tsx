import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
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
  
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [hideLoading, setHideLoading] = useState(false);

  useEffect(() => {
    if (isSuccess && visible) {
      setHideLoading(true);
      setShowCheckmark(true);
      
      // Call onAnimationComplete after animation sequence
      const timer = setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 1350); // Total animation time: 200 + 150 + 800 + 200
      
      return () => clearTimeout(timer);
    }
  }, [isSuccess, visible, onAnimationComplete]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transitionProperty: ['opacity'],
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease-in-out',
      }}
    >
      {/* Loading Indicator */}
      <Animated.View 
        style={{
          opacity: hideLoading ? 0 : 1,
          transitionProperty: ['opacity'],
          transitionDuration: '150ms',
          transitionTimingFunction: 'ease-in-out',
        }}
      >
        <ActivityIndicator 
          size="large" 
          color={themeColors.mountainGreen} 
        />
      </Animated.View>

      {/* Success Checkmark */}
      <Animated.View 
        style={{
          position: 'absolute',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themeColors.mountainGreen,
          borderRadius: 35,
          width: 70,
          height: 70,
          opacity: showCheckmark ? 1 : 0,
          transform: [{ scale: showCheckmark ? 1 : 0 }],
          ...(showCheckmark && {
            animationName: {
              '0%': { 
                opacity: 0,
                transform: [{ scale: 0 }] 
              },
              '15%': { 
                opacity: 1,
                transform: [{ scale: 1.2 }] 
              },
              '30%': { 
                transform: [{ scale: 1 }] 
              },
              '80%': { 
                opacity: 1,
                transform: [{ scale: 1 }] 
              },
              '100%': { 
                opacity: 0,
                transform: [{ scale: 0 }] 
              },
            },
            animationDuration: '1350ms',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
          }),
        }}
      >
        <Feather name="check" size={40} color="white" />
      </Animated.View>
    </Animated.View>
  );
};

export default LoginLoadingOverlay; 