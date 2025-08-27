import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { LocationContextProps } from '@/types/allTypes';

const LocationContext = createContext<LocationContextProps | undefined>(undefined);

// Default San Francisco location
const DEFAULT_LOCATION = {
  city: 'San Francisco',
  state: 'CA',
  lat: 37.7749,
  lng: -122.4194,
  text: 'San Francisco, CA'
};

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
  const [currentLocation, setCurrentLocation] = useState<LocationContextProps['currentLocation']>(DEFAULT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastFetchTime = useRef<number>(0);

  // Function to fetch and set current location
  const fetchCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      // Check if we've fetched recently (within 5 minutes)
      const now = Date.now();
      if (lastFetchTime.current && now - lastFetchTime.current < 5 * 60 * 1000 && currentLocation) {
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const newLocation = {
          city: geocode[0].city || DEFAULT_LOCATION.city,
          state: geocode[0].region || DEFAULT_LOCATION.state,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          text: `${geocode[0].city || DEFAULT_LOCATION.city}, ${geocode[0].region || DEFAULT_LOCATION.state}`
        };
        setCurrentLocation(newLocation);
        lastFetchTime.current = now;
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get current location');
      // Use default location on error
      setCurrentLocation(DEFAULT_LOCATION);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Initialize location
  useEffect(() => {
    const initializeLocation = async () => {
      const permissionGranted = await requestLocationPermission();
      setLocationPermission(permissionGranted);
      
      if (permissionGranted) {
        await fetchCurrentLocation();
        
        // Watch for significant location changes
        locationWatcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 300000, // 5 minutes
            distanceInterval: 1000, // 1km
          },
          async (location) => {
            try {
              const geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              });
              
              if (geocode.length > 0) {
                const newLocation = {
                  city: geocode[0].city || DEFAULT_LOCATION.city,
                  state: geocode[0].region || DEFAULT_LOCATION.state,
                  lat: location.coords.latitude,
                  lng: location.coords.longitude,
                  text: `${geocode[0].city || DEFAULT_LOCATION.city}, ${geocode[0].region || DEFAULT_LOCATION.state}`
                };
                setCurrentLocation(newLocation);
              }
            } catch (error) {
              console.error('Error updating location:', error);
            }
          }
        );
      } else {
        // Use default location if permission denied
        setCurrentLocation(DEFAULT_LOCATION);
      }
    };
  
    initializeLocation();

    // Cleanup
    return () => {
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }
    };
  }, []);

  // Handle app state changes - refresh location when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && locationPermission) {
        fetchCurrentLocation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [locationPermission]);

  const refreshLocation = useCallback(async () => {
    if (locationPermission) {
      await fetchCurrentLocation();
    }
  }, [locationPermission]);

  const setCustomLocation = useCallback((location: { city: string; state: string; lat: number; lng: number; text: string }) => {
    setCurrentLocation(location);
    // Stop watching location when user sets custom location
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  }, []);

  return (
    <LocationContext.Provider value={{ 
      locationPermission,
      currentLocation,
      isLoadingLocation,
      locationError,
      refreshLocation,
      setCustomLocation
    }}>
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