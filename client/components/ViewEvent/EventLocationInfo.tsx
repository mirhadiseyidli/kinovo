import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventLocationInfoProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import MapViewModal from '../MapViewModal';
import OpenMapsAndNavigateButton from '../OpenMapsAndNavigateButton';
// import { WeatherDisplay } from './EventLocationWeather';

const EventLocationInfo: React.FC<EventLocationInfoProps> = React.memo(({ location }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 12 }} >
          <Feather name="map-pin" size={16} color={themeColors.mountainGreen} />
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <ThemedText>{location?.text || 'Location TBD'}</ThemedText>
            <ThemedText style={{ color: themeColors.placeholderTextColor }}>
              {location?.city}, {location?.state}
            </ThemedText>
          </View>
        </View>
        {/* <View>
          <WeatherDisplay lat={location.coordinates.lat} lon={location.coordinates.lng} size={24} />
        </View> */}
      </View>
      {location?.coordinates?.lat != null && location?.coordinates?.lng != null && (
        <View style={{ flex: 1, width: '100%', height: 150, borderRadius: 8, overflow: 'hidden' }}>
          <MapViewModal
            coordinates={{
              latitude: location.coordinates.lat,
              longitude: location.coordinates.lng,
            }}
            selectedLocation={location.text}
          />
          <View
            pointerEvents="box-only"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'transparent',
              zIndex: 1,
            }}
          />
          <OpenMapsAndNavigateButton 
            selectedLocation={location.text}
            latitude={location.coordinates.lat}
            longitude={location.coordinates.lng}
          />
        </View>
      )}
    </View>
)});

export default EventLocationInfo;