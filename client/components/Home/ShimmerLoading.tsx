import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Image } from 'expo-image';

interface ShimmerLoadingProps {
  style?: any;
  colors?: string[];
  duration?: number;
  height?: number;
  borderRadius?: number;
  themeColors: any;
  colorScheme: 'light' | 'dark';
}

export const ShimmerLoading = React.memo<ShimmerLoadingProps>(({
  style,
  colors,
  duration = 1500,
  height = 16,
  borderRadius = 8,
  themeColors
}) => {
  const opacity = useSharedValue(0.3);
  const translateX = useSharedValue(-100);

  const shimmerColors = colors || [
    themeColors.inputBackgroundColor,
    themeColors.mountainGreen,
    themeColors.inputBackgroundColor
  ];

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    // Opacity animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );

    // Shimmer sweep animation
    translateX.value = withRepeat(
      withTiming(200, { duration: duration }),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateX);
    };
  }, [duration]);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius,
          backgroundColor: themeColors.inputBackgroundColor,
          overflow: 'hidden',
        },
        style,
        shimmerStyle
      ]}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            position: 'absolute',
          },
          gradientStyle
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
});

ShimmerLoading.displayName = 'ShimmerLoading';

interface LoadingStateProps {
  themeColors: any;
  colorScheme: 'light' | 'dark';
  style?: any;
}

export const LoadingState = React.memo<LoadingStateProps>(({
  themeColors,
  colorScheme,
  style
}) => {
  const shimmerProgress = useSharedValue(0);
  const text = "Getting your personalized insights...";
  const totalLength = text.length + 1; // +1 for the image

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 3500 }), // Much slower animation - 1 second more
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmerProgress);
    };
  }, []);

  const AnimatedText = Animated.createAnimatedComponent(Text);

  const imageStyle = useAnimatedStyle(() => {
    const progress = shimmerProgress.value * totalLength;
    const opacity = interpolate(
      progress,
      [-1, 0, 0.2, 0.7],
      [1, 0.3, 0.3, 1], // Slightly slower transition back to full opacity for image
      'clamp'
    );
    
    return {
      opacity,
    };
  });

  const CharacterShimmer = ({ char, index }: { char: string; index: number }) => {
    const charStyle = useAnimatedStyle(() => {
      const progress = shimmerProgress.value * totalLength;
      const charPosition = index + 1; // +1 because image is at position 0
      
      // Normal shimmer speed for text (2-3 characters)
      const opacity = interpolate(
        progress,
        [charPosition - 2, charPosition - 1, charPosition, charPosition + 1, charPosition + 2],
        [1, 0.5, 0.3, 0.5, 1], // Keep original text shimmer timing
        'clamp'
      );
      
      return {
        opacity,
      };
    });

    return (
      <AnimatedText style={[{ fontSize: 16, color: themeColors.text }, charStyle]}>
        {char}
      </AnimatedText>
    );
  };

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Animated.View style={[{ marginRight: 4 }, imageStyle]}>
        {colorScheme === 'dark' ? (
          <Image 
            source={require('@/assets/aiAssistantWhite.gif')}
            style={{ width: 24, height: 24 }}
            cachePolicy="disk"
            allowDownscaling={true}
          />
        ) : (
          <Image 
            source={require('@/assets/aiAssistant.gif')}
            style={{ width: 24, height: 24 }}
            cachePolicy="disk"
            allowDownscaling={true}
          />
        )}
      </Animated.View>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {text.split('').map((char, index) => (
          <CharacterShimmer key={index} char={char} index={index} />
        ))}
      </View>
    </View>
  );
});

LoadingState.displayName = 'LoadingState';

interface LoadingTextProps {
  text: string;
  style?: any;
}

export const LoadingText = React.memo<LoadingTextProps>(({
  text,
  style
}) => {
  const opacity = useSharedValue(0.7);

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.7, { duration: 1000 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, []);

  return (
    <Animated.Text style={[style, textStyle]}>
      {text}
    </Animated.Text>
  );
});

LoadingText.displayName = 'LoadingText';

// Contextual loading words similar to Claude Code
const LOADING_WORDS = [
  'checking',
  'searching', 
  'analyzing',
  'processing',
  'thinking',
  'loading',
  'preparing',
  'updating',
  'fetching',
  'generating'
];

interface ContextualLoadingProps {
  themeColors: any;
  context?: string;
  userMessage?: string;
  style?: any;
}

export const ContextualLoading = React.memo<ContextualLoadingProps>(({
  themeColors,
  context,
  userMessage,
  style
}) => {
  const shimmerProgress = useSharedValue(-1);
  
  // Smart context detection based on user message content
  const getSmartContext = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    // Question patterns
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why') || lowerMessage.includes('when') || lowerMessage.includes('where') || lowerMessage.includes('?')) {
      return 'thinking';
    }
    
    // Search/find patterns
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('look for') || lowerMessage.includes('show me')) {
      return 'searching';
    }
    
    // Analysis patterns
    if (lowerMessage.includes('analyze') || lowerMessage.includes('compare') || lowerMessage.includes('review') || lowerMessage.includes('explain')) {
      return 'analyzing';
    }
    
    // Creation patterns
    if (lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('build') || lowerMessage.includes('generate') || lowerMessage.includes('write')) {
      return 'generating';
    }
    
    // Update/modify patterns
    if (lowerMessage.includes('update') || lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('edit')) {
      return 'updating';
    }
    
    // Check/verify patterns
    if (lowerMessage.includes('check') || lowerMessage.includes('verify') || lowerMessage.includes('validate') || lowerMessage.includes('confirm')) {
      return 'checking';
    }
    
    // Process patterns
    if (lowerMessage.includes('process') || lowerMessage.includes('handle') || lowerMessage.includes('manage')) {
      return 'processing';
    }
    
    // Prepare patterns
    if (lowerMessage.includes('prepare') || lowerMessage.includes('setup') || lowerMessage.includes('organize')) {
      return 'preparing';
    }
    
    // Default to thinking for conversational messages
    return 'thinking';
  };

  // Select appropriate loading word based on context, user message, or random
  const getLoadingText = () => {
    if (context) {
      switch (context.toLowerCase()) {
        case 'search':
        case 'find':
          return 'Searching...';
        case 'check':
        case 'verify':
          return 'Checking...';
        case 'analyze':
        case 'analysis':
          return 'Analyzing...';
        case 'process':
        case 'processing':
          return 'Processing...';
        case 'generate':
        case 'create':
          return 'Generating...';
        case 'fetch':
        case 'load':
          return 'Fetching...';
        case 'update':
          return 'Updating...';
        case 'prepare':
          return 'Preparing...';
        case 'thinking':
          return 'Thinking...';
        default:
          return 'Loading...';
      }
    }
    
    // Smart detection based on user message
    if (userMessage) {
      const smartContext = getSmartContext(userMessage);
      return `${smartContext.charAt(0).toUpperCase() + smartContext.slice(1)}...`;
    }
    
    // Random word if no context or message provided
    const randomWord = LOADING_WORDS[Math.floor(Math.random() * LOADING_WORDS.length)];
    return `${randomWord.charAt(0).toUpperCase() + randomWord.slice(1)}...`;
  };

  const text = getLoadingText();
  const totalLength = text.length; // +1 for the image

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 3500 }), // Same slower animation as LoadingState
      0,
      false
    );

    return () => {
      cancelAnimation(shimmerProgress);
    };
  }, []);

  const AnimatedText = Animated.createAnimatedComponent(Text);

  // Image animation style (same as LoadingState)
  const imageStyle = useAnimatedStyle(() => {
    const progress = shimmerProgress.value * totalLength;
    const opacity = interpolate(
      progress,
      [-1, 0, 0.2, 0.7],
      [1, 0.3, 0.3, 1],
      'clamp'
    );
    
    return {
      opacity,
    };
  });

  const CharacterShimmer = ({ char, index }: { char: string; index: number }) => {
    const charStyle = useAnimatedStyle(() => {
      const progress = shimmerProgress.value * totalLength;
      const charPosition = index + 1; // +1 because image is at position 0
      
      const opacity = interpolate(
        progress,
        [charPosition - 2, charPosition - 1, charPosition, charPosition + 1, charPosition + 2],
        [1, 0.5, 0.3, 0.5, 1],
        'clamp'
      );
      
      return {
        opacity,
      };
    });

    return (
      <AnimatedText style={[{ fontSize: 16, color: themeColors.text }, charStyle]}>
        {char}
      </AnimatedText>
    );
  };

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>   
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {text.split('').map((char, index) => (
          <CharacterShimmer key={index} char={char} index={index} />
        ))}
      </View>
    </View>
  );
});

ContextualLoading.displayName = 'ContextualLoading';