import React, { useState } from 'react';
import type { EventImageProps, UploadedImage } from '@/types/allTypes';
import { View, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const defaultEventImages: Record<string, any> = {
  Soccer: require('@/assets/event-hike.webp'),
  Hiking: require('@/assets/event-hike.webp'),
  Art: require('@/assets/event-soccer.jpg'),
  Outdoor: require('@/assets/event-soccer.jpg'),
  Default: require('@/assets/event-default.png'), // Default placeholder
};

const EventImage: React.FC<EventImageProps> = ({ eventType }) => {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage>(null);
  const screenWidth = Dimensions.get('window').width;

  // Handle Image Upload
  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please grant permission to access your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setUploadedImage(result.assets[0].uri); // Set the uploaded image URI
      }
    } catch (error) {
      Alert.alert('Error', 'Could not upload the image.');
    }
  };

  // Remove Uploaded Image
  const handleRemoveImage = () => {
    setUploadedImage(null);
  };

  // Determine the image source (uploaded image OR default event category)
  const imageSource = uploadedImage
    ? { uri: uploadedImage }
    : defaultEventImages[eventType || 'Default']; // Fallback to 'default' if eventType is undefined

  return (
    <ThemedView
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}
    >
      <View
        style={{
          width: screenWidth / 2,
          height: screenWidth / 2,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Image
          source={imageSource}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />

        {/* Upload Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            backgroundColor: '#4FB9AF',
            borderRadius: 20,
            padding: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleImageUpload}
        >
          <Feather name="image" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Remove Image Button (only visible if an image is uploaded) */}
        {uploadedImage && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: '#ff4d4d',
              borderRadius: 20,
              padding: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleRemoveImage}
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
};

export default EventImage;