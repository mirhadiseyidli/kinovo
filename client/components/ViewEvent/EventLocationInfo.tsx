import React, { useState, useEffect } from 'react';
import { View, InteractionManager } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventLocationInfoProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import MapViewModal from '../MapViewModal';
import OpenMapsAndNavigateButton from '../OpenMapsAndNavigateButton';
import { WeatherDisplay } from './EventLocationWeather';
import MapView, { Marker } from 'react-native-maps';
import OptimizedMapView from '../OptimizedMapView';

const EventLocationInfo: React.FC<EventLocationInfoProps> = React.memo(({ location }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Defer map loading until after interactions/animations are complete
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsMapReady(true);
    });
    
    return () => task.cancel();
  }, []);

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 12 }} >
          <Feather name="map-pin" size={16} color={themeColors.mountainGreen} />
          <View style={{ flexDirection: 'column', gap: 4 }}>
            <ThemedText>{location?.text || 'Location TBD'}</ThemedText>
            <ThemedText style={{ color: themeColors.placeholderTextColor }}>
              {(location?.city && location?.state)
                ? `${location.city}, ${location.state}`
                : (location?.city || location?.state || 'TBD')}
            </ThemedText>
          </View>
        </View>
        <View>
          <WeatherDisplay lat={location.coordinates.lat} lon={location.coordinates.lng} size={24} />
        </View>
      </View>
      {location?.coordinates?.lat != null && location?.coordinates?.lng != null && isMapReady && (
        <OptimizedMapView
          coordinates={{
            latitude: location.coordinates.lat,
            longitude: location.coordinates.lng,
          }}
          selectedLocation={location.text}
        />
      )}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 60,
          height: 60,
          zIndex: 1000,
          elevation: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        pointerEvents="box-none" // Allow children to receive events
      >
        <OpenMapsAndNavigateButton 
          selectedLocation={location.text}
          latitude={location.coordinates.lat ?? 0}
          longitude={location.coordinates.lng ?? 0}
        />
      </View>
    </View>
  );
});

export default EventLocationInfo;