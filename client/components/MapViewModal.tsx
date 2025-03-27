import React from 'react';
import { Dimensions, View, Modal, TouchableWithoutFeedback } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import MapView, { Marker } from 'react-native-maps';
import { MapViewModalProps } from '@/types/allTypes';

const MapViewModal = ({
  locationPermission,
  coordinates,
  selectedLocation
}: MapViewModalProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const {width, height} = Dimensions.get('window');
  const aspect_ratio = width / height;
  const latitudeDelta = 0.05;
  const longitudeDelta = latitudeDelta * aspect_ratio;

  return (
    <MapView
      loadingEnabled={true}
      showsUserLocation={locationPermission === true}
      userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: 8
      }}
      region={{
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: latitudeDelta, // Zooms in closer
        longitudeDelta: longitudeDelta, // Zooms in closer
      }}
    >
      <Marker coordinate={coordinates} title={selectedLocation || 'Selected Location'} pinColor={themeColors.mountainGreen}/>
    </MapView>
  );
};

export default MapViewModal;