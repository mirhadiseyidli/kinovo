import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { Image } from 'expo-image';
import { SkeletonBox } from './Skeleton';

interface DefaultProfilePictureProps {
  profilePicture?: string | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  size: number;
  borderRadius?: number;
  showBorder?: boolean;
  borderColor?: string;
}

const DefaultProfilePicture: React.FC<DefaultProfilePictureProps> = React.memo(({
  profilePicture,
  firstName,
  lastName,
  fullName,
  size,
  borderRadius,
  showBorder = false,
  borderColor
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const radius = borderRadius ?? size / 2;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset loading states when profilePicture changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to fallback after 3 seconds if image doesn't load
    if (profilePicture) {
      timeoutRef.current = setTimeout(() => {
        setImageError(true);
      }, 3000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [profilePicture]);

  // Get names for initials generation
  let firstNameToUse = firstName;
  let lastNameToUse = lastName;

  // If fullName is provided but first/last names are not, split the fullName
  if (fullName && !firstName && !lastName) {
    const nameParts = fullName.trim().split(' ');
    firstNameToUse = nameParts[0] || '';
    lastNameToUse = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  }

  // Render default profile picture with initials
  const renderDefaultProfilePicture = () => {
    const initials = getInitials(firstNameToUse || '', lastNameToUse || '');
    const backgroundColor = getRandomColor(firstNameToUse || '', lastNameToUse || '');
    
    return (
      <View style={{ 
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: showBorder ? 2 : 0,
        borderColor: borderColor || themeColors.mountainGreen,
      }}>
        <Text style={{ 
          fontSize: size * 0.35, 
          fontWeight: 'bold', 
          color: 'white',
          textAlign: 'center'
        }}>
          {initials}
        </Text>
      </View>
    );
  };

  // Render generic user icon fallback
  const renderGenericIcon = () => (
    <View style={{
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: themeColors.inputBackgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: showBorder ? 2 : 0,
      borderColor: borderColor || themeColors.mountainGreen,
    }}>
      <Feather name="user" size={size * 0.5} color={themeColors.placeholderTextColor} />
    </View>
  );

  // Render actual profile picture
  const renderProfilePicture = () => (
    <View style={{
      width: size,
      height: size,
      borderRadius: radius,
      overflow: 'hidden',
      borderWidth: showBorder ? 2 : 0,
      borderColor: borderColor || themeColors.mountainGreen,
    }}>
      {/* Show skeleton while loading */}
      {!imageLoaded && !imageError && (
        <SkeletonBox width={size} height={size} borderRadius={radius} />
      )}
      
      {/* Show fallback if error occurred */}
      {imageError && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {renderDefaultProfilePicture()}
        </View>
      )}
      
      {/* Show image */}
      {!imageError && profilePicture && (
        <Image
          source={{ uri: profilePicture }}
          style={{
            width: '100%',
            height: '100%',
            opacity: imageLoaded ? 1 : 0,
          }}
          contentFit="cover"
          onLoad={(event) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setImageLoaded(true);
          }}
          onError={(error) => {
            setImageError(true);
          }}
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={profilePicture}
          allowDownscaling={false}
          transition={0}
        />
      )}
    </View>
  );

  // Main render logic
  if (profilePicture) {
    return renderProfilePicture();
  } else if (firstNameToUse || lastNameToUse) {
    return renderDefaultProfilePicture();
  } else {
    return renderGenericIcon();
  }
});

DefaultProfilePicture.displayName = 'DefaultProfilePicture';

export default DefaultProfilePicture; 