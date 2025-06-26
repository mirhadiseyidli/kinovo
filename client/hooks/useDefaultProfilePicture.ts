import { useState } from 'react';
import { Alert } from 'react-native';
import { useCDNImageUpload, CDNUploadResult } from './useCDNImageUpload';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import api from '@/utils/api';

export interface DefaultProfilePictureResult {
  success: boolean;
  url?: string;
  message: string;
}

export const useDefaultProfilePicture = () => {
  const [generating, setGenerating] = useState(false);
  const { uploadProfilePicture } = useCDNImageUpload();

  const generateAndUploadDefaultProfilePicture = async (
    firstName: string = '',
    lastName: string = ''
  ): Promise<DefaultProfilePictureResult> => {
    setGenerating(true);

    try {
      // Get initials and color
      const initials = getInitials(firstName, lastName);
      const backgroundColor = getRandomColor(firstName, lastName);
      
      // Generate the profile picture on the server
      const generateResponse = await api.post('/api/users/generate-profile-picture', {
        initials,
        backgroundColor,
      });

      if (!generateResponse.data.success) {
        setGenerating(false);
        return {
          success: false,
          message: generateResponse.data.message || 'Failed to generate profile picture'
        };
      }

      const pngDataUri = generateResponse.data.dataUri;

      // Upload the generated PNG data URI to CDN
      const uploadResult = await uploadProfilePicture(pngDataUri);

      setGenerating(false);
      return {
        success: uploadResult.success,
        url: uploadResult.url,
        message: uploadResult.success ? 'Default profile picture created successfully' : (uploadResult.message || 'Upload failed')
      };

    } catch (error: any) {
      console.error('Error generating default profile picture:', error);
      setGenerating(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate default profile picture'
      };
    }
  };

  const checkAndGenerateDefaultProfilePicture = async (
    hasProfilePicture: boolean,
    firstName: string = '',
    lastName: string = ''
  ): Promise<DefaultProfilePictureResult | null> => {
    // Only generate if user doesn't have a profile picture and has a name
    if (hasProfilePicture || (!firstName && !lastName)) {
      return null;
    }

    return await generateAndUploadDefaultProfilePicture(firstName, lastName);
  };

  return {
    generating,
    generateAndUploadDefaultProfilePicture,
    checkAndGenerateDefaultProfilePicture,
  };
}; 