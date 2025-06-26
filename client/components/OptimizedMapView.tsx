import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, InteractionManager, Dimensions, ViewStyle, DimensionValue } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MapSkeleton } from './Skeleton';
import MapView, { Marker, MapViewProps } from 'react-native-maps';
import { useLocation } from '@/context/LocationContext';

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
  const locationPermission = useLocation();

  // Use the settings hook with correct props
  const { uiSettings } = useMapSettings({
    interactive,
    locationPermission: Boolean(locationPermission.locationPermission),
    coordinates
  });

  useEffect(() => {
    mountedRef.current = true;
    
    if (lazy) {
      // Defer map loading until after interactions/animations are complete
      interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        if (mountedRef.current) {
          setShouldRender(true);
          
          // Additional delay for VectorKit stability
          setTimeout(() => {
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
      }
    };
  }, [lazy, loadDelay]);

  // Cleanup on unmount to free memory
  useEffect(() => {
    return () => {
      // Force cleanup of map resources
      setIsMapReady(false);
      setShouldRender(false);
    };
  }, []);

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

  const containerStyle: ViewStyle = {
    height, 
    width: width as DimensionValue, 
    borderRadius: 8,
    overflow: 'hidden'
  };

  // Ensure title is always a string
  const markerTitle = selectedLocation?.toString() ?? 'Selected Location';

  return (
    <View style={[containerStyle, style]}>
      <MapView {...uiSettings} userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}>
        {showMarker && (
          <Marker 
            coordinate={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            }} 
            title={markerTitle}
            pinColor={themeColors.mountainGreen}
          />
        )}
      </MapView>
    </View>
  );
};

// Visibility hook for lazy loading maps
export const useMapVisibility = (threshold: number = 100) => {
  const [isVisible, setIsVisible] = useState(false);
  const viewRef = useRef<View>(null);

  const checkVisibility = useCallback(() => {
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
  }, [threshold]);

  useEffect(() => {
    const timer = setTimeout(checkVisibility, 100);
    return () => clearTimeout(timer);
  }, [checkVisibility]);

  return {
    isVisible,
    viewRef,
    checkVisibility,
  };
};

export default React.memo(OptimizedMapView);