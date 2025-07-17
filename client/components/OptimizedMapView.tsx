import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, InteractionManager, Dimensions, ViewStyle, DimensionValue } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MapSkeleton } from './Skeleton';
import MapView, { Marker, MapViewProps } from 'react-native-maps';
import { useLocation } from '@/context/LocationContext';
import { useMapMemoryOptimization } from '@/hooks/useMapMemoryOptimization';

export interface OptimizedMapViewProps {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  selectedLocation?: string | null;
  height?: number;
  width?: DimensionValue;
  zoom?: number;
  interactive?: boolean;
  showMarker?: boolean;
  lazy?: boolean;
  loadDelay?: number;
  style?: ViewStyle;
}

const { width: screenWidth } = Dimensions.get('window');

// Memoized marker component
const MapMarker = React.memo<{
  coordinate: { latitude: number; longitude: number };
  title: string;
  pinColor: string;
}>(({ coordinate, title, pinColor }) => (
  <Marker 
    coordinate={coordinate}
    title={title}
    pinColor={pinColor}
  />
));
MapMarker.displayName = 'MapMarker';

// Create a function for all map settings
const useMapSettings = (props: {
  interactive: boolean,
  locationPermission: boolean,
  coordinates: { latitude: number, longitude: number }
}): { uiSettings: Partial<MapViewProps> } => {
  // UI Settings - match exactly what's being used in MapView
  const uiSettings = React.useMemo(() => ({
    loadingEnabled: true,
    showsUserLocation: Boolean(props.locationPermission),
    scrollEnabled: false,
    zoomEnabled: false,
    pitchEnabled: false,
    rotateEnabled: false,
    style: { 
      width: '100%', 
      height: '100%',
    } as ViewStyle,
    region: {
      latitude: props.coordinates.latitude,
      longitude: props.coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  }), [
    props.locationPermission, 
    props.coordinates.latitude, 
    props.coordinates.longitude
  ]);

  return {
    uiSettings
  };
};

const OptimizedMapView: React.FC<OptimizedMapViewProps> = ({
  coordinates,
  selectedLocation,
  height = 150,
  width = '100%',
  zoom = 15,
  interactive = false,
  showMarker = true,
  lazy = true,
  loadDelay = 500,
  style
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isMapReady, setIsMapReady] = useState(!lazy);
  const [shouldRender, setShouldRender] = useState(!lazy);
  const mountedRef = useRef(true);
  const interactionTaskRef = useRef<any>(null);
  const mapLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationPermission = useLocation();

  // Generate unique map ID for memory optimization
  const mapId = useMemo(() => 
    `map_${coordinates.latitude}_${coordinates.longitude}_${Date.now()}`, 
    [coordinates.latitude, coordinates.longitude]
  );

  // Use memory optimization hook
  const { shouldRenderMap, cleanupMaps, unregisterMap } = useMapMemoryOptimization(mapId, {
    enableBackgroundCleanup: true,
    interactionDelay: loadDelay,
    maxMapInstances: 2 // Limit concurrent maps
  });

  // Use the settings hook with correct props
  const { uiSettings } = useMapSettings({
    interactive,
    locationPermission: Boolean(locationPermission.locationPermission),
    coordinates
  });

  // Memoize container style to prevent recreation
  const containerStyle: ViewStyle = useMemo(() => ({
    height, 
    width: width as DimensionValue, 
    borderRadius: 8,
    overflow: 'hidden'
  }), [height, width]);

  // Memoize marker title to prevent string processing on every render
  const markerTitle = useMemo(() => 
    selectedLocation?.toString() ?? 'Selected Location', 
    [selectedLocation]
  );

  // Memoize marker coordinate to prevent object recreation
  const markerCoordinate = useMemo(() => ({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  }), [coordinates.latitude, coordinates.longitude]);

  // Memoized map event handlers to prevent recreation
  const handleMapReady = useCallback(() => {
    // Optional: Handle Map Ready changes if needed
  }, []);

  const handleRegionChangeComplete = useCallback(() => {
    // Optional: Handle region changes if needed
  }, []);

  // Cleanup function for MapView resources
  const cleanupMapResources = useCallback(() => {
    try {
      // Clear any pending timeouts
      if (mapLoadTimeoutRef.current) {
        clearTimeout(mapLoadTimeoutRef.current);
        mapLoadTimeoutRef.current = null;
      }
      
      // Clear any map-specific resources
      if (mapRef.current) {
        // Force cleanup of map tiles and cache
        mapRef.current = null;
      }
      
      // Unregister this specific map instance
      if (unregisterMap) {
        unregisterMap(mapId);
      }
      
      if (mountedRef.current) {
        setIsMapReady(false);
        setShouldRender(false);
      }
    } catch (error) {
      console.warn('Error cleaning up map resources:', error);
    }
  }, [unregisterMap, mapId]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (lazy && shouldRenderMap) {
      // Defer map loading until after interactions/animations are complete
      interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        if (mountedRef.current) {
          setShouldRender(true);
          
          // Additional delay for VectorKit stability
          mapLoadTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setIsMapReady(true);
            }
          }, loadDelay);
        }
      });
    }
    
    return () => {
      mountedRef.current = false;
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
        interactionTaskRef.current = null;
      }
      if (mapLoadTimeoutRef.current) {
        clearTimeout(mapLoadTimeoutRef.current);
        mapLoadTimeoutRef.current = null;
      }
    };
  }, [lazy, loadDelay, shouldRenderMap]);

  // Cleanup on unmount to free memory - enhanced version
  useEffect(() => {
    return () => {
      // Comprehensive cleanup
      cleanupMapResources();
      
      // Cancel any pending tasks
      if (interactionTaskRef.current) {
        interactionTaskRef.current.cancel();
        interactionTaskRef.current = null;
      }
    };
  }, [cleanupMapResources]);

  // Don't render if memory optimization says no
  if (!shouldRenderMap) {
    return (
      <View style={style}>
        <MapSkeleton height={typeof height === 'number' ? height : 150} />
      </View>
    );
  }

  // Don't render anything if not ready
  if (!shouldRender) {
    return (
      <View style={style}>
        <MapSkeleton height={typeof height === 'number' ? height : 150} />
      </View>
    );
  }

  // Show loading state while map initializes
  if (!isMapReady) {
    return (
      <View style={style}>
        <MapSkeleton height={typeof height === 'number' ? height : 150} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <MapView 
        ref={mapRef}
        {...uiSettings} 
        userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        // Memory optimization props
        cacheEnabled={true}
        loadingEnabled={true}
        loadingIndicatorColor={themeColors.mountainGreen}
        loadingBackgroundColor={themeColors.background}
        // Limit tile loading for better performance
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {showMarker && (
          <MapMarker
            coordinate={markerCoordinate}
            title={markerTitle}
            pinColor={themeColors.mountainGreen}
          />
        )}
      </MapView>
    </View>
  );
};

// Enhanced visibility hook for lazy loading maps with memory optimization
export const useMapVisibility = (threshold: number = 100) => {
  const [isVisible, setIsVisible] = useState(false);
  const viewRef = useRef<View>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const checkVisibility = useCallback(() => {
    if (viewRef.current && mountedRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        if (mountedRef.current) {
          const windowHeight = Dimensions.get('window').height;
          const isElementVisible = (
            y < windowHeight + threshold &&
            y + height > -threshold
          );
          setIsVisible(isElementVisible);
        }
      });
    }
  }, [threshold]);

  useEffect(() => {
    mountedRef.current = true;
    timeoutRef.current = setTimeout(checkVisibility, 100);
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [checkVisibility]);

  return {
    isVisible,
    viewRef,
    checkVisibility,
  };
};

// Enhanced memo comparison for better optimization
const mapPropsAreEqual = (
  prevProps: OptimizedMapViewProps, 
  nextProps: OptimizedMapViewProps
) => {
  return (
    prevProps.coordinates.latitude === nextProps.coordinates.latitude &&
    prevProps.coordinates.longitude === nextProps.coordinates.longitude &&
    prevProps.selectedLocation === nextProps.selectedLocation &&
    prevProps.height === nextProps.height &&
    prevProps.width === nextProps.width &&
    prevProps.interactive === nextProps.interactive &&
    prevProps.showMarker === nextProps.showMarker &&
    prevProps.lazy === nextProps.lazy
  );
};

export default React.memo(OptimizedMapView, mapPropsAreEqual);