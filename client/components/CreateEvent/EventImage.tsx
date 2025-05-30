import React, { useState } from 'react';
import type { EventImageProps, UploadedImage } from '@/types/allTypes';
import { View, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getCategoryImage } from '@/constants/CategoryImages';

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
    : getCategoryImage(eventType);

  return (
    <View style={{ width: '60%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
      <Image
        source={imageSource}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />
    </View>
  );
};

export default EventImage;