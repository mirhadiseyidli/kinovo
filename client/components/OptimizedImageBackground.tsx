import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ImageBackground,
  ImageStyle,
  ViewStyle,
  StyleSheet,
  ImageBackgroundProps,
  Platform,
  PixelRatio,
} from 'react-native';
import { getCategoryImage } from '@/constants/CategoryImages';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SkeletonBox } from './Skeleton';

interface OptimizedImageBackgroundProps extends Omit<ImageBackgroundProps, 'source'> {
  source: string | null;
  fallbackCategory?: string | null;
  width?: number;
  height?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  imageStyle?: ImageStyle;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const CDN_DOMAIN = 'cdn.kinovo.app';

// Generate optimized CDN URL with query parameters
const generateOptimizedURL = (
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }
): string => {
  if (!originalUrl || !originalUrl.includes(CDN_DOMAIN)) {
    return originalUrl;
  }

  const {
    width,
    height,
    quality = 85,
    format = 'webp',
  } = options;

  const params = new URLSearchParams();
  
  if (width) params.append('w', Math.round(width).toString());
  if (height) params.append('h', Math.round(height).toString());
  if (quality && quality !== 85) params.append('q', quality.toString());
  if (format && format !== 'jpeg') params.append('f', format);
  
  // Add cache busting for development
  if (__DEV__) {
    params.append('v', Date.now().toString());
  }

  const queryString = params.toString();
  return queryString ? `${originalUrl}?${queryString}` : originalUrl;
};

export const OptimizedImageBackground: React.FC<OptimizedImageBackgroundProps> = ({
  source,
  style,
  imageStyle,
  fallbackCategory,
  width = 400,
  height = 300,
  quality = 85,
  onLoad,
  onError,
  children,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Get optimized source
  const getOptimizedSource = () => {
    if (!source) {
      return fallbackCategory ? getCategoryImage(fallbackCategory) : null;
    }

    const optimizedUrl = generateOptimizedURL(source, {
      width,
      height,
      quality,
      format: 'webp'
    });

    return { uri: optimizedUrl };
  };

  const optimizedSource = getOptimizedSource();

  const handleLoad = () => {
    if (mountedRef.current) {
      setIsLoading(false);
      onLoad?.();
    }
  };

  const handleError = () => {
    if (mountedRef.current) {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    }
  };

  // If we have an error and fallback category, use that
  const finalSource = hasError && fallbackCategory
    ? getCategoryImage(fallbackCategory)
    : optimizedSource;

  if (!finalSource) {
    return (
      <View style={[style, { backgroundColor: themeColors.eventCardBackgroundColor }]}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      {...props}
      source={finalSource}
      style={[style]}
      imageStyle={[
        imageStyle,
        isLoading && { opacity: 0 }
      ]}
      onLoad={handleLoad}
      onError={handleError}
    >
      {isLoading && (
        <SkeletonBox
          width="100%"
          height="100%"
          borderRadius={style?.borderRadius as number || 0}
        />
      )}
      {children}
    </ImageBackground>
  );
};

export default OptimizedImageBackground; 