import React from 'react';
import { View, Text, TextInput, Dimensions, Image, TouchableOpacity } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EditUserCoverPhotosProps } from '@/types/allTypes';

const EditUserCoverPhotos = ({ user }: EditUserCoverPhotosProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  return (
    // Cover Photo
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      width: '100%', 
      height: 300, 
      zIndex: -1,
    }}>
      {user.coverPhoto ? (
        <>
          <Image
            source={{ uri: user.coverPhoto }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
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
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          right: 16, 
          top: 4, 
          backgroundColor: themeColors.buttonBackgroundColor, 
          padding: 12, 
          borderRadius: 8, 
          marginTop: insets.top 
        }}
      >
        <Feather name='camera' color={themeColors.text} size={32}/>
      </TouchableOpacity>
    </View>
  );
};

export default EditUserCoverPhotos;