import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image as RNImage } from 'react-native';
import { User } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { SkeletonBox } from '../Skeleton';
import { Image } from 'expo-image';

const EventCreationDetails = (
  { event_creator, event_creation_time }: 
  { event_creator: User | null; event_creation_time: Date | null }
) => {

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reset loading states when profile picture changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to fallback after 3 seconds if image doesn't load
    if (event_creator?.profile_picture) {
      timeoutRef.current = setTimeout(() => {
        setImageError(true);
      }, 3000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [event_creator?.profile_picture]);

  // Render default profile picture with initials
  const renderDefaultProfilePicture = () => {
    if (!event_creator?.full_name) {
      return (
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: themeColors.inputBackgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: themeColors.mountainGreen,
        }}>
          <Feather name="user" size={16} color={themeColors.placeholderTextColor} />
        </View>
      );
    }

    const nameParts = event_creator.full_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    const initials = getInitials(firstName, lastName);
    const backgroundColor = getRandomColor(firstName, lastName);
    
    return (
      <View style={{ 
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: themeColors.mountainGreen,
      }}>
        <Text style={{ 
          fontSize: 11, 
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
    <View style={{ 
      flex: 1, 
      flexDirection: 'row', 
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }}>
      <View style={{ flexDirection: 'row', height: 32, alignItems: 'center', gap: 8 }}>
        {/* Profile Picture */}
        {event_creator?.profile_picture ? (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: themeColors.mountainGreen,
          }}>
            {/* Show skeleton while loading */}
            {!imageLoaded && !imageError && (
              <SkeletonBox width={32} height={32} borderRadius={16} />
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
            {!imageError && (
              <Image
                source={{ uri: event_creator.profile_picture }}
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
                recyclingKey={event_creator.profile_picture}
                allowDownscaling={false}
                transition={0}
              />
            )}
          </View>
        ) : (
          renderDefaultProfilePicture()
        )}
        
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <ThemedText style={{ fontSize: 10, color: themeColors.placeholderTextColor }}>Created by</ThemedText>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: themeColors.text }}>{event_creator?.full_name}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', height: '100%', justifyContent: 'flex-end', paddingVertical: 1 }}>
        <ThemedText style={{ fontSize: 10, color: themeColors.placeholderTextColor }}>
          {event_creation_time ? new Date(event_creation_time).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : ''}
        </ThemedText>
      </View>
    </View>
  );
};

export default React.memo(EventCreationDetails);