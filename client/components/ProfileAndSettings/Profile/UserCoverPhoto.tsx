import React from 'react';
import { View, Image, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserCoverPhotoProps } from '@/types/allTypes';

const UserCoverPhoto = ({ cover_photo }: UserCoverPhotoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      width: '100%', 
      height: 300, 
      zIndex: -1,
    }}>
      {cover_photo ? (
        <>
          <Image
            source={{ uri: cover_photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            fadeDuration={100}
            progressiveRenderingEnabled
          />
          <LinearGradient
            colors={['transparent', 'red', themeColors.background]}
            style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
          />
        </>
      ) : (
        <>
          <View style={{ width: '100%', height: '100%', backgroundColor: themeColors.mountainGreen }} />
          <LinearGradient
            colors={['transparent', themeColors.background]}
            style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0 }}
          />
        </>
      )}
    </View>
  );
};

export default UserCoverPhoto;