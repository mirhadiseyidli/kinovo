import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Image, 
  ImageStyle, 
  ViewStyle, 
  Platform,
  PixelRatio,
  Dimensions
} from 'react-native';
import { getCategoryImage } from '@/constants/CategoryImages';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SkeletonBox } from './Skeleton';

export interface OptimizedCDNImageProps {
  source: string | null;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  fallbackCategory?: string | null;
  width?: number;
  height?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  priority?: 'high' | 'normal' | 'low';
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  enableBlurUp?: boolean;
  loadingTimeout?: number; // New: configurable timeout
}

const CDN_DOMAIN = 'cdn.kinovo.app'; // Your CDN domain
const { width: screenWidth } = Dimensions.get('window');

// Device capability detection
const getDeviceCapabilities = () => {
  const pixelRatio = PixelRatio.get();
  const supportsWebP = Platform.OS === 'android' || Platform.OS === 'ios';
  const supportsAVIF = false; // Most mobile browsers don't support AVIF yet
  
  return {
    pixelRatio,
    supportsWebP,
    supportsAVIF,
    preferredFormat: supportsWebP ? 'webp' : 'jpeg'
  };
};

// Generate optimized CDN URL with query parameters
const generateOptimizedURL = (
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    pixelRatio?: number;
  }
): string => {
  if (!originalUrl || !originalUrl.includes(CDN_DOMAIN)) {
    return originalUrl; // Return as-is for non-CDN URLs
  }

  const {
    width,
    height,
    quality = 85,
    format = 'webp',
    pixelRatio = 1
  } = options;

  const params = new URLSearchParams();
  
  if (width) params.append('w', Math.round(width * pixelRatio).toString());
  if (height) params.append('h', Math.round(height * pixelRatio).toString());
  if (quality && quality !== 85) params.append('q', quality.toString());
  if (format && format !== 'jpeg') params.append('f', format);
  
  // Add cache busting for development
  if (__DEV__) {
    params.append('v', Date.now().toString());
  }

  const queryString = params.toString();
  return queryString ? `${originalUrl}?${queryString}` : originalUrl;
};

// Generate multiple image variants for different scenarios
const generateImageVariants = (
  originalUrl: string,
  width: number,
  height: number,
  capabilities: ReturnType<typeof getDeviceCapabilities>
) => {
  if (!originalUrl || !originalUrl.includes(CDN_DOMAIN)) {
    return { primary: originalUrl, fallback: originalUrl, lowQuality: originalUrl };
  }

  const baseOptions = { width, height, pixelRatio: capabilities.pixelRatio };

  return {
    // Primary: Best format with full quality
    primary: generateOptimizedURL(originalUrl, {
      ...baseOptions,
      format: capabilities.preferredFormat,
      quality: 85
    }),
    
    // Fallback: JPEG for compatibility
    fallback: generateOptimizedURL(originalUrl, {
      ...baseOptions,
      format: 'jpeg',
      quality: 85
    }),
    
    // Low quality for blur-up effect
    lowQuality: generateOptimizedURL(originalUrl, {
      width: Math.round(width * 0.1),
      height: Math.round(height * 0.1),
      format: 'jpeg',
      quality: 20,
      pixelRatio: 1
    })
  };
};

// Enhanced loading state type
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'timeout';

export const OptimizedCDNImage: React.FC<OptimizedCDNImageProps> = ({
  source,
  style,
  containerStyle,
  fallbackCategory,
  width = 300,
  height = 300,
  quality = 85,
  onLoad,
  onError,
  lazy = false,
  priority = 'normal',
  resizeMode = 'cover',
  enableBlurUp = true,
  loadingTimeout = 10000 // 10 second default timeout
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentSourceRef.current = currentSource;
  }, [currentSource]);
  const [blurUpLoaded, setBlurUpLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  // Refs for cleanup and state management
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  const loadStartedRef = useRef(false);
  const imageLoadedRef = useRef(false);
  const currentSourceRef = useRef<string | null>(null);
  const maxRetries = 3;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset all loading state when source changes
  const resetLoadingState = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    loadStartedRef.current = false;
    imageLoadedRef.current = false;
    setBlurUpLoaded(false);
    setRetryCount(0);
  }, []);

  // Force transition to loaded state (safety net)
  const forceLoadComplete = useCallback((reason: string) => {
    if (!mountedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    imageLoadedRef.current = true;
    setLoadingState('loaded');
    onLoad?.();
  }, []);

  // Start loading timeout
  const startLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !imageLoadedRef.current) {
        setLoadingState('timeout');
        if (!mountedRef.current) return;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        imageLoadedRef.current = true;
        setLoadingState('loaded');
        onLoad?.();
      }
    }, loadingTimeout);
  }, [loadingTimeout, onLoad]);

  // Enhanced error handling with better retry logic
  const handleImageError = useCallback((errorSource: string, isMainImage: boolean = true) => {
    if (!mountedRef.current) return;

    // For non-CDN images or if we've exceeded retries, go to error state
    if (!source?.includes(CDN_DOMAIN) || retryCount >= maxRetries) {
      setLoadingState('error');
      setCurrentSource(null);
      onError?.();
      return;
    }

    // Try fallback strategies
    const capabilities = getDeviceCapabilities();
    const variants = generateImageVariants(source, width, height, capabilities);
    
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Reset loading state for retry
    setLoadingState('loading');
    loadStartedRef.current = false;
    imageLoadedRef.current = false;
    
    if (newRetryCount === 1 && variants.fallback !== variants.primary) {
      // First retry: try JPEG fallback
      setCurrentSource(variants.fallback);
      startLoadingTimeout();
    } else if (newRetryCount === 2) {
      // Second retry: try original URL without transformations
      setCurrentSource(source);
      startLoadingTimeout();
    } else {
      // Third retry: try base CDN URL with minimal params
      const baseUrl = source.split('?')[0]; // Remove any existing params
      setCurrentSource(baseUrl);
      startLoadingTimeout();
    }
  }, [retryCount, source, width, height, onError, startLoadingTimeout]);

  // Generate optimized URLs when source changes
  useEffect(() => {
    resetLoadingState();

    if (!source) {
      setCurrentSource(null);
      setLoadingState('loaded'); // Show fallback immediately
      return;
    }

    const capabilities = getDeviceCapabilities();
    const variants = generateImageVariants(source, width, height, capabilities);
    
    setCurrentSource(variants.primary);
    setLoadingState('loading');
    
    // Start timeout for this load attempt
    startLoadingTimeout();

    // Preload blur-up image if enabled (non-blocking)
    if (enableBlurUp && variants.lowQuality !== variants.primary) {
      Image.prefetch(variants.lowQuality)
        .then(() => {
          if (mountedRef.current) {
            setBlurUpLoaded(true);
          }
        })
        .catch(() => {
          // Ignore blur-up failures, they're not critical
          console.log('[OptimizedCDNImage] Blur-up preload failed (non-critical)');
        });
    }

    // Enhanced preload strategy
    const preloadDelay = priority === 'high' ? 0 : priority === 'normal' ? 100 : 500;
    
    const preloadTimer = setTimeout(() => {
      if (mountedRef.current && !imageLoadedRef.current) {
        Image.prefetch(variants.primary)
          .then(() => {
            // If prefetch succeeds but component hasn't loaded yet, force complete after delay
            setTimeout(() => {
              if (mountedRef.current && !imageLoadedRef.current) {
                if (!mountedRef.current) return;
                
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                
                imageLoadedRef.current = true;
                setLoadingState('loaded');
                onLoad?.();
              }
            }, 500); // Give 500ms for normal events to fire
          })
          .catch(() => {
            // If prefetch fails, try fallback
            if (mountedRef.current && variants.fallback !== variants.primary) {
              setCurrentSource(variants.fallback);
            }
          });
      }
    }, preloadDelay);

    return () => {
      clearTimeout(preloadTimer);
      resetLoadingState();
    };
  }, [source, width, height, quality, priority, enableBlurUp, startLoadingTimeout, resetLoadingState, onLoad]);

  // Enhanced event handlers with better reliability
  const handleLoadStart = useCallback(() => {
    if (mountedRef.current && !loadStartedRef.current) {
      loadStartedRef.current = true;
      setLoadingState('loading');
      startLoadingTimeout(); // Restart timeout on load start
    }
  }, [startLoadingTimeout]);

  const handleLoad = useCallback(() => {
    if (mountedRef.current && !imageLoadedRef.current) {
      imageLoadedRef.current = true;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setLoadingState('loaded');
      onLoad?.();
    }
  }, [onLoad]);

  const handleError = useCallback(() => {
    handleImageError(currentSourceRef.current || 'unknown', true);
  }, [handleImageError]); // Use ref to avoid dependency loops

  // Get the final image source to display
  const getDisplaySource = () => {
    if (loadingState === 'error' || !source) {
      return getCategoryImage(fallbackCategory);
    }
    return currentSource ? { uri: currentSource } : getCategoryImage(fallbackCategory);
  };

  const displaySource = getDisplaySource();
  
  // Improved skeleton visibility logic
  const shouldShowSkeleton = useMemo(() => {
    // Don't show skeleton if we're in error state or loaded
    if (loadingState === 'error' || loadingState === 'loaded') {
      return false;
    }
    
    // Show skeleton if we're loading and don't have blur-up yet
    if (loadingState === 'loading' || loadingState === 'idle') {
      return !blurUpLoaded;
    }
    
    // Show skeleton for timeout state briefly before forcing load
    if (loadingState === 'timeout') {
      return false; // Force show image even on timeout
    }
    
    return false;
  }, [loadingState, blurUpLoaded]);

  const shouldShowBlur = enableBlurUp && blurUpLoaded && (loadingState === 'loading' || loadingState === 'idle');

  // For lazy loading, return placeholder
  if (lazy && (loadingState === 'loading' || loadingState === 'idle') && !currentSource) {
    return (
      <View style={[containerStyle, style, { backgroundColor: themeColors.inputBackgroundColor }]}>
        <SkeletonBox width="100%" height="100%" borderRadius={0} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, { position: 'relative' }]}>
      {/* Blur-up background image */}
      {shouldShowBlur && source?.includes(CDN_DOMAIN) && (
        <Image
          source={{ 
            uri: generateOptimizedURL(source, {
              width: Math.round(width * 0.1),
              height: Math.round(height * 0.1),
              format: 'jpeg',
              quality: 20
            })
          }}
          style={[style, { position: 'absolute', opacity: 0.5 }]}
          resizeMode={resizeMode}
          blurRadius={2}
          onError={() => {
            // If blur-up fails, don't crash the main image
            console.log('[OptimizedCDNImage] Blur-up image failed (non-critical)');
          }}
        />
      )}

      {/* Main image */}
      <Image
        source={displaySource}
        style={[
          style,
          shouldShowSkeleton && { opacity: 0.3 }
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        fadeDuration={loadingState === 'loaded' ? 300 : 0}
      />
      
      {/* Loading skeleton overlay */}
      {shouldShowSkeleton && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <SkeletonBox 
            width="100%" 
            height="100%" 
            borderRadius={0}
          />
        </View>
      )}
    </View>
  );
};

// Hook for bulk image preloading with CDN optimization
export const useCDNImagePreloader = () => {
  const preloadImages = useCallback(async (
    imageUrls: string[],
    options: { width?: number; height?: number; priority?: 'high' | 'normal' | 'low' } = {}
  ) => {
    const { width = 300, height = 300, priority = 'normal' } = options;
    const capabilities = getDeviceCapabilities();
    
    const optimizedUrls = imageUrls
      .filter(url => url && url.includes(CDN_DOMAIN))
      .map(url => generateOptimizedURL(url, {
        width,
        height,
        format: capabilities.preferredFormat,
        pixelRatio: capabilities.pixelRatio
      }));

    const delay = priority === 'high' ? 0 : priority === 'normal' ? 50 : 200;
    
    // Batch preload with delays to avoid overwhelming the network
    const batchSize = 5;
    for (let i = 0; i < optimizedUrls.length; i += batchSize) {
      const batch = optimizedUrls.slice(i, i + batchSize);
      
      await Promise.allSettled(
         batch.map(url => 
           new Promise<void>(resolve => {
             setTimeout(() => {
               Image.prefetch(url).finally(() => resolve());
             }, delay * (i / batchSize));
           })
         )
      );
    }
  }, []);

  return { preloadImages };
};

export default OptimizedCDNImage; 