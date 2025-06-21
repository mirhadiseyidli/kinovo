import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator, InteractionManager, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AppleMaps } from 'expo-maps';
import { AppleMapsMapType } from 'expo-maps/build/apple/AppleMaps.types';

export interface OptimizedMapViewProps {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  selectedLocation?: string | null;
  height?: number;
  width?: number | string;
  zoom?: number;
  interactive?: boolean;
  showMarker?: boolean;
  lazy?: boolean;
  loadDelay?: number;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

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

  // Memoize marker to prevent unnecessary re-renders
  const marker = React.useMemo(() => {
    if (!showMarker) return [];
    
    return [{
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      },
      tintColor: themeColors.mountainGreen,
      title: selectedLocation || ''
    }];
  }, [coordinates.latitude, coordinates.longitude, themeColors.mountainGreen, selectedLocation, showMarker]);

  // Memoize camera position to prevent unnecessary re-renders
  const cameraPosition = React.useMemo(() => ({
    coordinates: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    },
    zoom: zoom
  }), [coordinates.latitude, coordinates.longitude, zoom]);

  // Memoize UI settings
  const uiSettings = React.useMemo(() => ({
    myLocationButtonEnabled: false,
    togglePitchEnabled: false,
    rotateGesturesEnabled: interactive,
    scrollGesturesEnabled: interactive,
    tiltGesturesEnabled: interactive,
    zoomGesturesEnabled: interactive,
  }), [interactive]);

  // Don't render anything if not ready
  if (!shouldRender) {
    return (
      <View 
        style={[
          { 
            height, 
            width, 
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center'
          },
          style
        ]}
      >
        <View style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          backgroundColor: themeColors.background,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="small" color={themeColors.mountainGreen} />
        </View>
      </View>
    );
  }

  // Show loading state while map initializes
  if (!isMapReady) {
    return (
      <View 
        style={[
          { 
            height, 
            width, 
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center'
          },
          style
        ]}
      >
        <ActivityIndicator size="small" color={themeColors.mountainGreen} />
      </View>
    );
  }

  return (
    <View 
      style={[
        { 
          height, 
          width, 
          borderRadius: 8,
          overflow: 'hidden'
        },
        style
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}
    >
      <AppleMaps.View
        style={{
          flex: 1,
          borderRadius: 8
        }}
        properties={{
          mapType: AppleMapsMapType.STANDARD,
        }}
        cameraPosition={cameraPosition}
        markers={marker}
        uiSettings={uiSettings}

      />
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