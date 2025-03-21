import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationContextProps {
  locationPermission: boolean | null;
}

const LocationContext = createContext<LocationContextProps | undefined>(undefined);

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      "Location Permission Denied",
      "Enable location access in settings to use this app."
    );
    return false;
  }
  return true;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      const permissionGranted = await requestLocationPermission();
      setLocationPermission(permissionGranted);
    };
  
    checkPermission();
  }, []);

  return (
    <LocationContext.Provider value={{ locationPermission }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextProps => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};