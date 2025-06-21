import { Image, ImageRequireSource } from 'react-native';
import { ImageSource } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { getCategoryImage } from '@/constants/CategoryImages';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  enableCaching?: boolean;
  placeholder?: ImageRequireSource;
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  cached: boolean;
}

// Cache directory for optimized images
const CACHE_DIR = `${FileSystem.cacheDirectory}optimized_images/`;

// Ensure cache directory exists
const ensureCacheDir = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

// Generate cache key for image
const generateCacheKey = (uri: string, options: ImageOptimizationOptions): string => {
  const { width = 300, height = 300, quality = 0.8, format = 'jpeg' } = options;
  const hash = uri.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${Math.abs(hash)}_${width}x${height}_${quality}_${format}`;
};

// Check if cached image exists
const getCachedImage = async (cacheKey: string): Promise<string | null> => {
  try {
    const cachedPath = `${CACHE_DIR}${cacheKey}`;
    const fileInfo = await FileSystem.getInfoAsync(cachedPath);
    return fileInfo.exists ? cachedPath : null;
  } catch (error) {
    console.warn('Error checking cached image:', error);
    return null;
  }
};

// Save optimized image to cache
const saveToCache = async (uri: string, cacheKey: string): Promise<string> => {
  try {
    await ensureCacheDir();
    const cachedPath = `${CACHE_DIR}${cacheKey}`;
    await FileSystem.copyAsync({
      from: uri,
      to: cachedPath,
    });
    return cachedPath;
  } catch (error) {
    console.warn('Error saving to cache:', error);
    return uri; // Return original if caching fails
  }
};

// Main image optimization function
export const optimizeImage = async (
  imageUri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> => {
  const {
    width = 300,
    height = 300,
    quality = 0.8,
    format = 'jpeg',
    enableCaching = true,
  } = options;

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(imageUri, options);
    
    // Check if cached version exists
    if (enableCaching) {
      const cachedPath = await getCachedImage(cacheKey);
      if (cachedPath) {
        return {
          uri: cachedPath,
          width,
          height,
          cached: true,
        };
      }
    }

    // Optimize the image
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width, height } }],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
      }
    );

    // Save to cache if enabled
    let finalUri = result.uri;
    if (enableCaching) {
      finalUri = await saveToCache(result.uri, cacheKey);
    }

    return {
      uri: finalUri,
      width: result.width,
      height: result.height,
      cached: false,
    };
  } catch (error) {
    console.warn('Error optimizing image:', error);
    // Return original image if optimization fails
    return {
      uri: imageUri,
      width,
      height,
      cached: false,
    };
  }
};

// Preload images for better performance
export const preloadImages = async (imageUris: string[], options?: ImageOptimizationOptions): Promise<void> => {
  try {
    const promises = imageUris.map(uri => optimizeImage(uri, options));
    await Promise.all(promises);
  } catch (error) {
    console.warn('Error preloading images:', error);
  }
};

// Clean up old cached images
export const cleanImageCache = async (maxAgeHours: number = 24 * 7): Promise<void> => {
  try {
    await ensureCacheDir();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = `${CACHE_DIR}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists && fileInfo.modificationTime) {
        const fileAge = now - fileInfo.modificationTime;
        if (fileAge > maxAge) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    }
  } catch (error) {
    console.warn('Error cleaning image cache:', error);
  }
};

// Get cache size
export const getCacheSize = async (): Promise<number> => {
  try {
    await ensureCacheDir();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const filePath = `${CACHE_DIR}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.warn('Error calculating cache size:', error);
    return 0;
  }
};

// Clear entire image cache
export const clearImageCache = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR);
    }
  } catch (error) {
    console.warn('Error clearing image cache:', error);
  }
};

// Utility to get optimized image source for different screen densities
export const getOptimizedImageSource = (
  uri: string | null,
  fallbackCategory?: string | null,
  screenWidth: number = 300
): ImageSource => {
  // Use category image as fallback
  if (!uri) {
    const categoryImage = getCategoryImage(fallbackCategory);
    // Handle both require() and { uri } formats
    if (typeof categoryImage === 'number') {
      return { uri: '' }; // Return empty uri for require() images
    }
    // Ensure we return the first element if it's an array
    return Array.isArray(categoryImage) ? categoryImage[0] : categoryImage;
  }

  // For network images, return optimized version
  if (uri.startsWith('http') || uri.startsWith('https')) {
    return {
      uri,
      width: screenWidth,
      height: screenWidth,
    };
  }

  // For local images, return as-is
  return { uri };
}; 