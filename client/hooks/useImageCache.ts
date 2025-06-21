import { useEffect, useCallback, useRef } from 'react';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface ImageCacheHook {
  preloadImages: (imageUrls: string[]) => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  cleanOldCache: (maxAgeHours?: number) => Promise<void>;
}

const CACHE_DIR = `${FileSystem.cacheDirectory}image_cache/`;
const MAX_CACHE_SIZE_MB = 50; // Maximum cache size in MB
const DEFAULT_MAX_AGE_HOURS = 24 * 7; // 1 week

export const useImageCache = (): ImageCacheHook => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Initialize cache directory
    initializeCacheDir();
    
    // Cleanup on app start
    cleanOldCache(DEFAULT_MAX_AGE_HOURS);

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initializeCacheDir = useCallback(async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.warn('Error initializing cache directory:', error);
    }
  }, []);

  const preloadImages = useCallback(async (imageUrls: string[]): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      // Filter for network images only
      const networkImages = imageUrls.filter(url => 
        url && (url.startsWith('http://') || url.startsWith('https://'))
      );

      // Use React Native's Image.prefetch for network images
      const prefetchPromises = networkImages.map(url => 
        Image.prefetch(url).catch(error => {
          console.warn(`Failed to prefetch image: ${url}`, error);
          return false;
        })
      );

      await Promise.allSettled(prefetchPromises);
      console.log(`Preloaded ${networkImages.length} images`);
    } catch (error) {
      console.warn('Error preloading images:', error);
    }
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      await initializeCacheDir();
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
  }, [initializeCacheDir]);

  const cleanOldCache = useCallback(async (maxAgeHours: number = DEFAULT_MAX_AGE_HOURS): Promise<void> => {
    try {
      await initializeCacheDir();
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileAge = now - fileInfo.modificationTime;
          if (fileAge > maxAge) {
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned ${deletedCount} old cached files`);
    } catch (error) {
      console.warn('Error cleaning old cache:', error);
    }
  }, [initializeCacheDir]);

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR);
        await initializeCacheDir();
        console.log('Image cache cleared');
      }
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }, [initializeCacheDir]);

  return {
    preloadImages,
    clearCache,
    getCacheSize,
    cleanOldCache,
  };
};

// Hook for automatic cache management
export const useAutomaticCacheManagement = () => {
  const { getCacheSize, cleanOldCache, clearCache } = useImageCache();

  useEffect(() => {
    const manageCacheSize = async () => {
      try {
        const sizeInBytes = await getCacheSize();
        const sizeInMB = sizeInBytes / (1024 * 1024);

        // If cache exceeds maximum size, clean old files
        if (sizeInMB > MAX_CACHE_SIZE_MB) {
          console.log(`Cache size (${sizeInMB.toFixed(2)}MB) exceeds limit, cleaning...`);
          await cleanOldCache(24 * 3); // Clean files older than 3 days
          
          // If still too large, clear entire cache
          const newSize = await getCacheSize();
          const newSizeInMB = newSize / (1024 * 1024);
          if (newSizeInMB > MAX_CACHE_SIZE_MB) {
            console.log('Cache still too large, clearing entire cache');
            await clearCache();
          }
        }
      } catch (error) {
        console.warn('Error managing cache size:', error);
      }
    };

    // Run cache management on mount and set up periodic cleanup
    manageCacheSize();
    
    const interval = setInterval(manageCacheSize, 24 * 60 * 60 * 1000); // Run daily
    
    return () => {
      clearInterval(interval);
    };
  }, [getCacheSize, cleanOldCache, clearCache]);
}; 