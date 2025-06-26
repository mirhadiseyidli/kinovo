import { useState } from 'react';
import api from '@/utils/api';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface CDNUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  message?: string;
}

export interface CDNImageInfo {
  profilePicture: string | null;
  coverPhoto: string | null;
}

export const useCDNImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get user's current images
  const getUserImages = async (): Promise<CDNImageInfo | null> => {
    try {
      const response = await api.get('/api/users/images');
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting user images:', error);
      return null;
    }
  };

  // Get CDN system information
  const getCDNInfo = async () => {
    try {
      const response = await api.get('/api/storage/info');
      return response.data;
    } catch (error) {
      console.error('Error getting CDN info:', error);
      return null;
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async (imageUri: string): Promise<CDNUploadResult> => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      
      // Get file extension
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `profile_picture.${fileExtension}`;
      
      // Determine mime type
      let mimeType = 'image/jpeg';
      if (fileExtension === 'png') mimeType = 'image/png';
      if (fileExtension === 'webp') mimeType = 'image/webp';

      formData.append('profilePicture', {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      } as any);

      setUploadProgress(50);

      const response = await api.post('/api/storage/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for image uploads
      });

      setUploadProgress(100);

      if (response.data.success) {
        return {
          success: true,
          url: response.data.data.url,
          key: response.data.data.key,
          message: 'Profile picture uploaded successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Upload failed'
        };
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Upload failed'
      };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload cover photo
  const uploadCoverPhoto = async (imageUri: string): Promise<CDNUploadResult> => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `cover_photo.${fileExtension}`;
      
      let mimeType = 'image/jpeg';
      if (fileExtension === 'png') mimeType = 'image/png';
      if (fileExtension === 'webp') mimeType = 'image/webp';

      formData.append('coverPhoto', {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      } as any);

      setUploadProgress(50);

      const response = await api.post('/api/storage/upload/cover-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      setUploadProgress(100);

      if (response.data.success) {
        return {
          success: true,
          url: response.data.data.url,
          key: response.data.data.key,
          message: 'Cover photo uploaded successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Upload failed'
        };
      }
    } catch (error: any) {
      console.error('Error uploading cover photo:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Upload failed'
      };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Remove profile picture
  const removeProfilePicture = async (): Promise<CDNUploadResult> => {
    try {
      const response = await api.delete('/api/users/profile-picture');
      
      if (response.data.success) {
        return {
          success: true,
          message: 'Profile picture removed successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to remove profile picture'
        };
      }
    } catch (error: any) {
      console.error('Error removing profile picture:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove profile picture'
      };
    }
  };

  // Remove cover photo
  const removeCoverPhoto = async (): Promise<CDNUploadResult> => {
    try {
      const response = await api.delete('/api/users/cover-photo');
      
      if (response.data.success) {
        return {
          success: true,
          message: 'Cover photo removed successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to remove cover photo'
        };
      }
    } catch (error: any) {
      console.error('Error removing cover photo:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove cover photo'
      };
    }
  };

  // Image picker for profile picture
  const pickAndUploadProfilePicture = async (): Promise<CDNUploadResult> => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        return {
          success: false,
          message: 'Permission to access photo library is required'
        };
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          message: 'Image selection was cancelled'
        };
      }

      const asset = result.assets[0];
      return await uploadProfilePicture(asset.uri);

    } catch (error: any) {
      console.error('Error picking and uploading profile picture:', error);
      return {
        success: false,
        message: 'Failed to pick and upload image'
      };
    }
  };

  // Image picker for cover photo
  const pickAndUploadCoverPhoto = async (): Promise<CDNUploadResult> => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        return {
          success: false,
          message: 'Permission to access photo library is required'
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // Wide aspect ratio for cover photos
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          message: 'Image selection was cancelled'
        };
      }

      const asset = result.assets[0];
      return await uploadCoverPhoto(asset.uri);

    } catch (error: any) {
      console.error('Error picking and uploading cover photo:', error);
      return {
        success: false,
        message: 'Failed to pick and upload image'
      };
    }
  };

  // Camera picker for profile picture
  const takeAndUploadProfilePicture = async (): Promise<CDNUploadResult> => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        return {
          success: false,
          message: 'Camera permission is required'
        };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          message: 'Photo capture was cancelled'
        };
      }

      const asset = result.assets[0];
      return await uploadProfilePicture(asset.uri);

    } catch (error: any) {
      console.error('Error taking and uploading profile picture:', error);
      return {
        success: false,
        message: 'Failed to take and upload photo'
      };
    }
  };

  // Show image picker options
  const showImagePickerOptions = (type: 'profile' | 'cover' = 'profile') => {
    const isProfile = type === 'profile';
    
    Alert.alert(
      `Select ${isProfile ? 'Profile Picture' : 'Cover Photo'}`,
      'Choose how you want to add your image',
      [
        {
          text: 'Camera',
          onPress: () => {
            if (isProfile) {
              takeAndUploadProfilePicture();
            } else {
              // Could add camera for cover photo if needed
              Alert.alert('Info', 'Camera option for cover photos coming soon!');
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            if (isProfile) {
              pickAndUploadProfilePicture();
            } else {
              pickAndUploadCoverPhoto();
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return {
    // State
    uploading,
    uploadProgress,
    
    // Methods
    getUserImages,
    getCDNInfo,
    uploadProfilePicture,
    uploadCoverPhoto,
    removeProfilePicture,
    removeCoverPhoto,
    pickAndUploadProfilePicture,
    pickAndUploadCoverPhoto,
    takeAndUploadProfilePicture,
    showImagePickerOptions,
  };
}; 