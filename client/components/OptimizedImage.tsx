import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Image, 
  ImageStyle, 
  ViewStyle, 
  ActivityIndicator,
  ImageRequireSource,
  Dimensions
} from 'react-native';
import { getCategoryImage } from '@/constants/CategoryImages';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export interface OptimizedImageProps {
  source: string | null;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  fallbackCategory?: string | null;
  placeholder?: ImageRequireSource;
  showLoader?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  quality?: number;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  threshold?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  fallbackCategory,
  placeholder,
  showLoader = true,
  resizeMode = 'cover',
  quality = 0.8,
  width,
  height,
  onLoad,
  onError,
  lazy = false,
  threshold = 50,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Determine the image source to use
  const getImageSource = () => {
    // If we have an error or no source, use fallback
    if (hasError || !source) {
      return getCategoryImage(fallbackCategory);
    }

    // For network images, use the source directly
    // Image prefetching and optimization will be handled by React Native
    if (source.startsWith('http') || source.startsWith('https')) {
      return { uri: source };
    }

    // For local URIs
    return { uri: source };
  };

  const imageSource = getImageSource();
  const shouldShowLoader = showLoader && isLoading && !hasError;

  // Get dimensions from style or props
  const getDimensions = () => {
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
    return {
      width: width || flatStyle.width || 300,
      height: height || flatStyle.height || 300,
    };
  };

  const dimensions = getDimensions();

  // For lazy loading, return placeholder until visible
  if (!isVisible) {
    return (
      <View style={[
        containerStyle, 
        style, 
        { backgroundColor: themeColors.inputBackgroundColor }
      ]}>
        {placeholder && (
          <Image
            source={placeholder}
            style={style}
            resizeMode={resizeMode}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[containerStyle, shouldShowLoader && { justifyContent: 'center', alignItems: 'center' }]}>
      {shouldShowLoader && (
        <ActivityIndicator 
          size="small" 
          color={themeColors.tint}
          style={{ position: 'absolute', zIndex: 1 }}
        />
      )}
      
      <Image
        source={imageSource}
        style={[
          style,
          shouldShowLoader && { opacity: 0.5 }
        ]}
        resizeMode={resizeMode}
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }}
      />
    </View>
  );
};

// Hook for lazy loading with intersection observer pattern
export const useLazyLoading = (threshold: number = 50) => {
  const [isVisible, setIsVisible] = useState(false);
  const viewRef = useRef<View>(null);

  const checkVisibility = () => {
    if (viewRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const isElementVisible = (
          y < windowHeight + threshold &&
          y + height > -threshold
        );
        setIsVisible(isElementVisible);
      });
    }
  };

  return {
    isVisible,
    viewRef,
    checkVisibility,
  };
};

// Memoized version for better performance
export const MemoizedOptimizedImage = React.memo(OptimizedImage);

export default OptimizedImage; 