import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';

interface MapMemoryOptimizationOptions {
  enableBackgroundCleanup?: boolean;
  interactionDelay?: number;
  maxMapInstances?: number;
}

interface MapMemoryOptimizationResult {
  shouldRenderMap: boolean;
  mapInstances: number;
  cleanupMaps: () => void;
  registerMap: (id: string) => void;
  unregisterMap: (id: string) => void;
}

// Global map instance tracker
const mapInstances = new Set<string>();
const MAX_CONCURRENT_MAPS = 3; // Limit concurrent map instances

export const useMapMemoryOptimization = (
  mapId: string,
  options: MapMemoryOptimizationOptions = {}
): MapMemoryOptimizationResult => {
  const {
    enableBackgroundCleanup = true,
    interactionDelay = 500,
    maxMapInstances = MAX_CONCURRENT_MAPS
  } = options;

  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [currentMapInstances, setCurrentMapInstances] = useState(mapInstances.size);
  const mountedRef = useRef(true);
  const interactionTaskRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
      }
    };
  }, []);

  // Register this map instance
  const registerMap = useCallback((id: string) => {
    if (mapInstances.size >= maxMapInstances) {
      console.warn(`Max map instances (${maxMapInstances}) reached. Consider lazy loading maps.`);
      return;
    }
    
    mapInstances.add(id);
    setCurrentMapInstances(mapInstances.size);
    console.log(`Map registered: ${id}. Total instances: ${mapInstances.size}`);
  }, [maxMapInstances]);

  // Unregister this map instance
  const unregisterMap = useCallback((id: string) => {
    mapInstances.delete(id);
    setCurrentMapInstances(mapInstances.size);
    console.log(`Map unregistered: ${id}. Total instances: ${mapInstances.size}`);
  }, []);

  // Clean up all maps
  const cleanupMaps = useCallback(() => {
    mapInstances.clear();
    setCurrentMapInstances(0);
    setShouldRenderMap(false);
    console.log('All maps cleaned up');
  }, []);

  // Delay map rendering until interactions are complete
  useEffect(() => {
    if (mapInstances.size >= maxMapInstances) {
      setShouldRenderMap(false);
      return;
    }

    interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (mountedRef.current) {
          setShouldRenderMap(true);
          registerMap(mapId);
        }
      }, interactionDelay);
    });

    return () => {
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
      }
      unregisterMap(mapId);
    };
  }, [mapId, interactionDelay, maxMapInstances, registerMap, unregisterMap]);

  // Handle app state changes for memory optimization
  useEffect(() => {
    if (!enableBackgroundCleanup) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (mountedRef.current && mapInstances.size < maxMapInstances) {
          setShouldRenderMap(true);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - clean up maps to save memory
        setShouldRenderMap(false);
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [enableBackgroundCleanup, maxMapInstances]);

  return {
    shouldRenderMap,
    mapInstances: currentMapInstances,
    cleanupMaps,
    registerMap,
    unregisterMap,
  };
};

// Hook for checking if device has sufficient memory for maps
export const useMapMemoryCheck = () => {
  const [hasLowMemory, setHasLowMemory] = useState(false);

  useEffect(() => {
    // Check available memory (iOS specific)
    const checkMemory = () => {
      // This is a simple heuristic - in production you might use a native module
      const isLowMemoryDevice = mapInstances.size > 2;
      setHasLowMemory(isLowMemoryDevice);
    };

    const interval = setInterval(checkMemory, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return { hasLowMemory };
};

// Global cleanup function for emergency memory situations
export const globalMapCleanup = () => {
  mapInstances.clear();
  console.log('Emergency map cleanup performed');
}; 