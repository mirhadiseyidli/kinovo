import React from 'react';
import OptimizedMapView from './OptimizedMapView';
import { MapViewModalProps } from '@/types/allTypes';

const MapViewModal = ({
  coordinates,
  selectedLocation,
}: MapViewModalProps) => {
  return (
    <OptimizedMapView
      coordinates={coordinates}
      selectedLocation={selectedLocation}
      height={150}
      width="100%"
      zoom={15}
      interactive={false}
      showMarker={true}
      lazy={true}
      loadDelay={300}
      style={{ borderRadius: 8 }}
    />
  );
};

export default React.memo(MapViewModal);
