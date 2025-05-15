import React from 'react';
import { Dimensions, View, Modal, TouchableWithoutFeedback, Platform } from "react-native";
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

  return (
    <AppleMaps.View
      style={{
        flex: 1, 
        borderRadius: 8
      }}
      properties={{
        mapType: AppleMapsMapType.STANDARD,
      }}
      cameraPosition={{
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        },
        zoom: 20
      }}
      markers={[
        {
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          tintColor: themeColors.mountainGreen,
          title: selectedLocation ? selectedLocation : ''
        }
      ]}
      uiSettings={{
        myLocationButtonEnabled: false,
        togglePitchEnabled: false,
      }}
    />
  );
};

export default React.memo(MapViewModal);
