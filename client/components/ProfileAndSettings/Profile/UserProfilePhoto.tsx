import React from 'react';
import { View, Image, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { UserProfilePhotoProps } from '@/types/allTypes';

const UserProfilePhoto = ({ profile_picture }: UserProfilePhotoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={{ width: 120, height: 120, borderRadius: 70, borderWidth: 2, borderColor: themeColors.mountainGreen, overflow: 'hidden' }}>
      {profile_picture ? (
        <Image
          source={{ uri: profile_picture }}
          style={{ width: '100%', height: '100%' }}
          fadeDuration={100}
          progressiveRenderingEnabled
        />
      ) : (
        <Feather name="user" size={80} color={themeColors.mountainGreen} />
      )}
    </View>
  );
};

export default UserProfilePhoto;