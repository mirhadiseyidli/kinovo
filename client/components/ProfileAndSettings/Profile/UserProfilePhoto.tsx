import React from 'react';
import { View, Dimensions, Text } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { UserProfilePhotoProps } from '@/types/allTypes';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { Image } from 'expo-image';
import { SkeletonBox } from '@/components/Skeleton';

const UserProfilePhoto = ({ profile_picture, firstName, lastName }: UserProfilePhotoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  // Render default profile picture component
  const renderDefaultProfilePicture = () => {
    const initials = getInitials(firstName || '', lastName || '');
    const backgroundColor = getRandomColor(firstName || '', lastName || '');
    
    return (
      <View style={{ 
        width: '100%',
        height: '100%',
        borderRadius: 70,
        backgroundColor: backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center',
      }}>
        <Text style={{ 
          fontSize: 42, 
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
    <View style={{ width: 120, height: 120, borderRadius: 70, borderWidth: 2, borderColor: themeColors.mountainGreen, overflow: 'hidden' }}>
      {profile_picture ? (
        <Image
          source={profile_picture}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          onError={() => {
            return renderDefaultProfilePicture();
          }}
          onProgress={() => {
            return <SkeletonBox width={120} height={120} borderRadius={70} />;
          }}
          cachePolicy="disk"
          allowDownscaling={true}
        />
      ) : (firstName || lastName) ? (
        // Show default profile picture with initials
        renderDefaultProfilePicture()
      ) : (
        // Show generic user icon if no name
        <View style={{ 
          width: '100%',
          height: '100%',
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: themeColors.inputBackgroundColor
        }}>
          <Feather name="user" size={60} color={themeColors.placeholderTextColor} />
        </View>
      )}
    </View>
  );
};

export default UserProfilePhoto;