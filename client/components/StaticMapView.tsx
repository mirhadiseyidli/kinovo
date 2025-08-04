import React, { useState, useCallback } from 'react';
import { 
  View, 
  Image, 
  TouchableOpacity, 
  ViewStyle, 
  ImageStyle,
  ActivityIndicator,
  Text
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MapSkeleton } from './Skeleton';
import OptimizedMapView, { OptimizedMapViewProps } from './OptimizedMapView';
import { Feather } from '@expo/vector-icons';

interface StaticMapViewProps extends OptimizedMapViewProps {
  mapSnapshotUrl?: {
    light: string | null;
    dark: string | null;
  } | null;
  onPress?: () => void;
  fallbackToInteractive?: boolean;
  showExpandIcon?: boolean;
}

const StaticMapView: React.FC<StaticMapViewProps> = ({
  mapSnapshotUrl,
  coordinates,
  selectedLocation,
  height = 150,
  width = '100%',
  onPress,
  fallbackToInteractive = true,
  showExpandIcon = true,
  style,
  ...mapProps
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Select the appropriate map snapshot URL based on the theme
  const currentMapSnapshotUrl = mapSnapshotUrl 
    ? (colorScheme === 'dark' ? mapSnapshotUrl.dark : mapSnapshotUrl.light)
    : null;

  console.log('[StaticMapView] Received mapSnapshotUrl:', mapSnapshotUrl);
  console.log('[StaticMapView] Current theme:', colorScheme);
  console.log('[StaticMapView] Selected URL:', currentMapSnapshotUrl);

  const handleImageError = useCallback(() => {
    console.log('Map snapshot failed to load, falling back to interactive map');
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const containerStyle: ViewStyle = {
    height,
    width: width as any,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: themeColors.mapBackground || themeColors.card,
    ...style as ViewStyle
  };

  const imageStyle: ImageStyle = {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  };

  // If no snapshot URL or image failed to load, use interactive map
  if (!currentMapSnapshotUrl || imageError) {
    // Log the specific reason for fallback
    if (!mapSnapshotUrl) {
      console.log('[StaticMapView] No map snapshot URL provided, falling back to interactive map');
    } else if (!currentMapSnapshotUrl) {
      console.log(`[StaticMapView] No ${colorScheme} theme snapshot URL available (light: ${mapSnapshotUrl?.light ? 'yes' : 'no'}, dark: ${mapSnapshotUrl?.dark ? 'yes' : 'no'}), falling back to interactive map`);
    } else if (imageError) {
      console.log(`[StaticMapView] Image failed to load for ${colorScheme} theme (URL: ${currentMapSnapshotUrl}), falling back to interactive map`);
    }

    if (!fallbackToInteractive) {
      console.log('[StaticMapView] Fallback to interactive map disabled, showing placeholder');
      return (
        <View style={containerStyle}>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: themeColors.mapBackground || themeColors.card
          }}>
            <Feather name="map" size={32} color={themeColors.placeholderTextColor} />
            <Text style={{ 
              color: themeColors.placeholderTextColor, 
              marginTop: 8,
              fontSize: 12
            }}>
              Map preview unavailable
            </Text>
          </View>
        </View>
      );
    }

    console.log('[StaticMapView] Using interactive map fallback');
    return (
      <OptimizedMapView
        coordinates={coordinates}
        selectedLocation={selectedLocation}
        height={height}
        width={width}
        style={style}
        {...mapProps}
      />
    );
  }

  // Use static map snapshot
  return (
    <TouchableOpacity 
      activeOpacity={onPress ? 0.8 : 1} 
      onPress={onPress}
      style={containerStyle}
    >
      <View style={{ flex: 1 }}>
        {imageLoading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.mapBackground || themeColors.card,
            zIndex: 1
          }}>
            <MapSkeleton height={typeof height === 'number' ? height : 150} />
          </View>
        )}
        
        <Image
          source={{ uri: currentMapSnapshotUrl }}
          style={imageStyle}
          onError={handleImageError}
          onLoad={handleImageLoad}
          resizeMode="cover"
        />

        {showExpandIcon && onPress && !imageLoading && (
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: themeColors.background,
            borderRadius: 20,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}>
            <Feather name="maximize-2" size={16} color={themeColors.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(StaticMapView);