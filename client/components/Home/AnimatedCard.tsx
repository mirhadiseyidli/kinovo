import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: any;
  animateHeight?: boolean;
  animateOpacity?: boolean;
  duration?: number;
  delay?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

export const AnimatedCard = React.memo<AnimatedCardProps>(({
  children,
  style,
  animateOpacity = true,
  duration = 400,
  delay = 0,
}) => {
  const opacity = useSharedValue(animateOpacity ? 0 : 1);
  const scale = useSharedValue(0.98);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (animateOpacity) {
        opacity.value = withTiming(1, { duration });
      }
      scale.value = withTiming(1, { duration });
    }, delay);

    return () => clearTimeout(timeout);
  }, [animateOpacity, duration, delay]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, []);

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

interface AnimatedContentProps {
  children: React.ReactNode;
  show: boolean;
  style?: any;
  delay?: number;
  duration?: number;
  translateY?: number;
}

export const AnimatedContent = React.memo<AnimatedContentProps>(({
  children,
  show,
  style,
  delay = 0,
  duration = 300,
  translateY = 20
}) => {
  const opacity = useSharedValue(0);
  const translateYValue = useSharedValue(translateY);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateYValue.value }],
  }));

  useEffect(() => {
    if (show) {
      setTimeout(() => {
        opacity.value = withTiming(1, { duration });
        translateYValue.value = withTiming(0, { duration });
      }, delay);
    } else {
      opacity.value = withTiming(0, { duration: duration / 2 });
      translateYValue.value = withTiming(translateY, { duration: duration / 2 });
    }
  }, [show, delay, duration, translateY]);

  useEffect(() => {
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateYValue);
    };
  }, []);

  if (!show && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
});

AnimatedContent.displayName = 'AnimatedContent';

interface ShimmerCardProps {
  style?: any;
  duration?: number;
}

export const ShimmerCard = React.memo<ShimmerCardProps>(({
  style,
  duration = 1500
}) => {
  const shimmerValue = useSharedValue(0);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.5 + 0.5 * Math.sin(shimmerValue.value * Math.PI * 2),
    };
  });

  useEffect(() => {
    const animate = () => {
      shimmerValue.value = withTiming(1, { duration }, (finished) => {
        if (finished) {
          shimmerValue.value = 0;
          animate();
        }
      });
    };

    animate();

    return () => {
      cancelAnimation(shimmerValue);
    };
  }, [duration]);

  return (
    <Animated.View style={[style, shimmerStyle]} />
  );
});

ShimmerCard.displayName = 'ShimmerCard';