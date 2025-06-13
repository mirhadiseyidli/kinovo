import React, { useState, useEffect } from 'react';
import type { EventImageProps, UploadedImage } from '@/types/allTypes';
import { View, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getCategoryImage } from '@/constants/CategoryImages';
import { useCreateEventContext } from '@/context/CreateEventContext';

const EventImage: React.FC<EventImageProps> = ({ eventType }) => {
  const { picture, settingEventPicture } = useCreateEventContext();
  const [uploadedImage, setUploadedImage] = useState<UploadedImage>(picture);
  const screenWidth = Dimensions.get('window').width;

  // Update local state when context changes
  useEffect(() => {
    setUploadedImage(picture);
  }, [picture]);

  // Handle Image Upload
  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please grant permission to access your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setUploadedImage(imageUri); // Set local state
        settingEventPicture(imageUri); // Update context
      }
    } catch (error) {
      Alert.alert('Error', 'Could not upload the image.');
    }
  };

  // Remove Uploaded Image
  const handleRemoveImage = () => {
    setUploadedImage(null);
    settingEventPicture(null);
  };

  // Determine the image source (uploaded image OR default event category)
  const imageSource = uploadedImage
    ? { uri: uploadedImage }
    : getCategoryImage(eventType);

  return (
    <TouchableOpacity 
      onPress={handleImageUpload}
      style={{ width: '60%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}
    >
      <Image
        source={imageSource}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />
      {uploadedImage && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 15,
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleRemoveImage}
        >
          <Feather name="x" size={18} color="white" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default EventImage;