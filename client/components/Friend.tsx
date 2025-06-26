import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import type { FriendProps } from '@/types/allTypes';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';

const Friend: React.FC<FriendProps & { refreshing: boolean, onPress?: () => void, displayName?: string }> = ({ 
  _id, 
  full_name, 
  profile_picture, 
  eventCount = 0, 
  size, 
  showName, 
  refreshing, 
  activityData, 
  onPress, 
  displayName 
}) => {
  const screenWidth = Dimensions.get('window').width;
  const defaultSize = screenWidth * 0.18; // Default: 18% of screen width
  const imageSize = size || defaultSize; // Use provided size or default
  const badgeSize = imageSize * 0.3; // Badge size relative to the image
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const [startPosition, setStartPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [loading, setLoading] = useState(false);
  const imageRef = useRef<View>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const truncateName = (name: string | undefined, maxLength: number) => {
    if (!name) return '';
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  // Use displayName for showing text, but full_name for generating initials
  const nameToShow = displayName || full_name;

  // Render default profile picture component
  const renderDefaultProfilePicture = () => {
    if (!full_name) return null;
    
    // Split full name to get first and last names for initials generation
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    const initials = getInitials(firstName, lastName);
    const backgroundColor = getRandomColor(firstName, lastName);
    
    return (
      <View style={{ 
        width: '100%',
        height: '100%',
        borderRadius: imageSize / 2,
        backgroundColor: backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center',
      }}>
        <Text style={{ 
          fontSize: imageSize * 0.35, 
          fontWeight: 'bold', 
          color: 'white',
          textAlign: 'center'
        }}>
          {initials}
        </Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity 
        style={{ alignItems: 'center' }}
      >
        {/* Friend Image with Event Count Badge */}
        <View
          ref={imageRef}
          style={{
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            width: imageSize,
            height: imageSize,
            backgroundColor: 'transparent',
            borderRadius: imageSize / 2,
            borderWidth: eventCount > 0 ? 2 : 0,
            borderColor: eventCount > 0 ? themeColors.mountainGreen : 'transparent',
            overflow: 'hidden'
          }}
        >
          {profile_picture ? (
            <Image
              source={{ uri: profile_picture }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: imageSize / 2,
              }}
              resizeMode="cover"
            />
          ) : full_name ? (
            // Show default profile picture with initials
            renderDefaultProfilePicture()
          ) : (
            // Show generic user icon if no name
            <View style={{
              width: '100%',
              height: '100%',
              borderRadius: imageSize / 2,
              backgroundColor: themeColors.inputBackgroundColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Feather name="user" size={imageSize * 0.5} color={themeColors.placeholderTextColor} />
            </View>
          )}

          {/* Event Count Badge */}
          {eventCount > 0 && (
            <View
              style={{
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                position: 'absolute',
                bottom: -badgeSize * 0.15,
                right: -badgeSize * 0.15,
                backgroundColor: themeColors.mountainGreen,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
                {eventCount}
              </Text>
            </View>
          )}
        </View>

        {/* Friend Name with Truncation */}
        {showName && (
          <ThemedText
            style={{
              fontSize: 10,
              textAlign: 'center',
              maxWidth: imageSize * 1.2, // Restrict width for truncation
              marginTop: 4,
            }}
          >
            {truncateName(nameToShow, 9)}
          </ThemedText>
        )}
      </TouchableOpacity>
    </>
  );
};

export default Friend;