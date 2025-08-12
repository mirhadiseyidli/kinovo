import React, { useEffect, useState } from 'react';
import Animated from 'react-native-reanimated';
import { View } from 'react-native';
import StaticMapView from './StaticMapView';
import { MapViewModalProps } from '@/types/allTypes';

const MapViewModal = ({
  coordinates,
  selectedLocation,
  mapSnapshotUrl,
}: MapViewModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const valid = coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude);
    setIsVisible(!!valid);
  }, [coordinates]);

  return (
    <Animated.View
      style={{
        height: isVisible ? 150 : 0,
        width: '100%',
        opacity: isVisible ? 1 : 0,
        transform: [
          { translateY: isVisible ? 0 : -150 },
          { scaleY: isVisible ? 1 : 0 }
        ],
        transitionProperty: ['opacity', 'transform', 'height'],
        transitionDuration: '300ms',
        transitionTimingFunction: 'ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      {isVisible && coordinates ? (
        <StaticMapView
          mapSnapshotUrl={mapSnapshotUrl}
          coordinates={coordinates}
          selectedLocation={selectedLocation}
          height={150}
          width="100%"
          zoom={15}
          interactive={false}
          showMarker={true}
          lazy={true}
          loadDelay={300}
          fallbackToInteractive={true}
          style={{ borderRadius: 8, marginTop: 16 }}
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 150,
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Empty state - could add a skeleton loader here */}
        </View>
      )}
    </Animated.View>
  );
};

export default React.memo(MapViewModal);
