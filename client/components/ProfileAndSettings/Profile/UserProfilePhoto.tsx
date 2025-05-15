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
    <View style={{ alignItems: 'center', marginTop: 150 }}>
      <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: themeColors.mountainGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
    </View>
  );
};

export default UserProfilePhoto;