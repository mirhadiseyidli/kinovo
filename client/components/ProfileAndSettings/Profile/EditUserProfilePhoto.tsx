import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Dimensions, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EditUserProfilePhotosProps } from '@/types/allTypes';
import { useCDNImageUpload } from '@/hooks/useCDNImageUpload';
import { useUserData } from '@/hooks/useUserData';
import { useDefaultProfilePicture } from '@/hooks/useDefaultProfilePicture';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { OptimizedCDNImage } from '@/components/OptimizedCDNImage';

const EditUserProfilePhotos = ({ user }: EditUserProfilePhotosProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { refetchUser } = useUserData();
  const [currentProfilePicture, setCurrentProfilePicture] = useState<string | null>(user.profile_picture || null);
  
  const {
    uploading,
    uploadProgress,
    pickAndUploadProfilePicture,
    takeAndUploadProfilePicture,
    removeProfilePicture,
    showImagePickerOptions
  } = useCDNImageUpload();

  const {
    generating,
    generateAndUploadDefaultProfilePicture,
  } = useDefaultProfilePicture();

  // Update local state when user prop changes
  useEffect(() => {
    setCurrentProfilePicture(user.profile_picture || null);
  }, [user.profile_picture]);

  const handleImageUpload = async () => {
    try {
      // Show image picker options (Camera or Photo Library)
      Alert.alert(
        'Select Profile Picture',
        'Choose how you want to add your profile picture',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await takeAndUploadProfilePicture();
              if (result.success) {
                setCurrentProfilePicture(result.url || null);
                // Refetch user data to update the parent component
                await refetchUser();
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Error', result.message);
              }
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await pickAndUploadProfilePicture();
              if (result.success) {
                setCurrentProfilePicture(result.url || null);
                // Refetch user data to update the parent component
                await refetchUser();
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Error', result.message);
              }
            },
          },
          {
            text: 'Generate Default',
            onPress: async () => {
              const result = await generateAndUploadDefaultProfilePicture(
                user.first_name || '',
                user.last_name || ''
              );
              if (result.success) {
                setCurrentProfilePicture(result.url || null);
                await refetchUser();
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Error', result.message);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleImageUpload:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeProfilePicture();
              if (result.success) {
                setCurrentProfilePicture(null);
                // Refetch user data to update the parent component
                await refetchUser();
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
            }
          },
        },
      ]
    );
  };

  const showProfilePictureOptions = () => {
    const hasProfilePicture = !!currentProfilePicture;
    
    const options = [
      {
        text: hasProfilePicture ? 'Change Picture' : 'Add Picture',
        onPress: handleImageUpload,
      },
    ];

    if (hasProfilePicture) {
      options.push({
        text: 'Remove Picture',
        onPress: handleRemoveImage,
        style: 'destructive',
      } as any);
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    } as any);

    Alert.alert(
      'Profile Picture',
      'What would you like to do?',
      options
    );
  };

  // Render default profile picture component
  const renderDefaultProfilePicture = () => {
    const initials = getInitials(user.first_name || '', user.last_name || '');
    const backgroundColor = getRandomColor(user.first_name || '', user.last_name || '');
    
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: backgroundColor,
        borderRadius: 70
      }}>
        <Text style={{ 
          fontSize: 50, 
          fontWeight: 'bold', 
          color: 'white',
          textAlign: 'center'
        }}>
          {initials}
        </Text>
      </View>
    );
  };

  const isLoadingState = uploading || generating;

  return (
    <View>
      <TouchableOpacity 
        onPress={showProfilePictureOptions}
        disabled={isLoadingState}
        style={{ 
          width: 140, 
          height: 140, 
          borderRadius: 70, 
          borderWidth: 2, 
          borderColor: themeColors.mountainGreen, 
          overflow: 'hidden',
          backgroundColor: isLoadingState ? themeColors.inputBackgroundColor : 'transparent'
        }}
      >
        {isLoadingState ? (
          // Upload/Generation progress indicator
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: themeColors.background + '80' // Semi-transparent
          }}>
            <ActivityIndicator size="large" color={themeColors.mountainGreen} />
            <Text style={{ 
              color: themeColors.text, 
              marginTop: 8, 
              fontSize: 12,
              textAlign: 'center'
            }}>
              {generating ? 'Generating...' : 'Uploading...'}
            </Text>
            {uploadProgress > 0 && (
              <Text style={{ 
                color: themeColors.textSecondary, 
                fontSize: 10,
                marginTop: 4
              }}>
                {uploadProgress}%
              </Text>
            )}
          </View>
        ) : currentProfilePicture ? (
          <OptimizedCDNImage
            source={currentProfilePicture}
            style={{ 
              width: '100%', 
              height: '100%',
              borderRadius: 70 
            }}
            resizeMode="cover"
            width={140}
            height={140}
            quality={85}
            priority="normal"
            enableBlurUp={true}
          />
        ) : (user.first_name || user.last_name) ? (
          // Show default profile picture with initials
          renderDefaultProfilePicture()
        ) : (
          // Show generic user icon if no name
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: themeColors.inputBackgroundColor
          }}>
            <Feather name="user" size={60} color={themeColors.placeholderTextColor} />
          </View>
        )}
      </TouchableOpacity>
      
      {/* Camera icon overlay */}
      <TouchableOpacity 
        onPress={isLoadingState ? undefined : showProfilePictureOptions}
        disabled={isLoadingState}
        style={{ 
          position: 'absolute',
          bottom: 5, 
          right: -1, 
          backgroundColor: themeColors.background,
          borderWidth: 1,
          borderColor: isLoadingState ? themeColors.placeholderTextColor : themeColors.text,
          padding: 10, 
          borderRadius: 50,
          opacity: isLoadingState ? 0.6 : 1
        }}
      >
        {isLoadingState ? (
          <ActivityIndicator size={20} color={themeColors.mountainGreen} />
        ) : (
          <Feather 
            name="camera" 
            size={20} 
            color={themeColors.text} 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default EditUserProfilePhotos;