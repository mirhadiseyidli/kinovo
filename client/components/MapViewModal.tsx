import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AppleMaps } from 'expo-maps';
import { MapViewModalProps } from '@/types/allTypes';
import { AppleMapsMapType } from 'expo-maps/build/apple/AppleMaps.types';

const MapViewModal = ({
  coordinates,
  selectedLocation,
}: MapViewModalProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Delay map rendering to avoid VectorKit errors
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapReady(true);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, []);
  
  // Memoize the marker to prevent unnecessary re-renders
  const marker = React.useMemo(() => [{
    coordinates: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    },
    tintColor: themeColors.mountainGreen,
    title: selectedLocation ? selectedLocation : ''
  }], [coordinates.latitude, coordinates.longitude, themeColors.mountainGreen, selectedLocation]);
  
  // Memoize camera position to prevent unnecessary re-renders
  const cameraPosition = React.useMemo(() => ({
    coordinates: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    },
    zoom: 20
  }), [coordinates.latitude, coordinates.longitude]);

  if (!isMapReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="small" color={themeColors.mountainGreen} />
      </View>
    );
  }

  return (
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
      uiSettings={{
        myLocationButtonEnabled: false,
        togglePitchEnabled: false,
      }}
    />
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(MapViewModal);
