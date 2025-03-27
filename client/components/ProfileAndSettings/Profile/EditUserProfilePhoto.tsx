import React from 'react';
import { View, Text, TextInput, Dimensions, Image, TouchableOpacity } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EditUserProfilePhotosProps } from '@/types/allTypes';

const EditUserProfilePhotos = ({ user }: EditUserProfilePhotosProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  return (
    //* Profile Picture
    <View style={{ alignItems: 'center', marginTop: 150 }}>
      <View 
        style={{ 
          width: 140, 
          height: 140, 
          borderRadius: 70, 
          borderWidth: 2, 
          borderColor: themeColors.mountainGreen, 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'hidden' 
        }}
      >
        {user.profile_picture ? (
          <Image
            source={{ uri: user.profile_picture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Feather name="user" size={80} color={themeColors.mountainGreen} />
        )}
      </View>
      <TouchableOpacity 
        style={{ 
          position: 'absolute',
          bottom: 5, 
          right: -3, 
          backgroundColor: themeColors.background,
          borderWidth: 1,
          borderColor: themeColors.text,
          padding: 10, 
          borderRadius: 50
        }}
      >
        <Feather name="camera" size={20} color={themeColors.text} />
      </TouchableOpacity>
    </View>
  );
};

export default EditUserProfilePhotos;