import React from 'react';
import { Image, View } from 'react-native';

type ProfileIconProps = {
  uri?: string; // URL of the profile picture
  size?: number; // Size of the icon (default: 28)
  defaultImage?: string; // Fallback image URL
};

export const ProfileIcon: React.FC<ProfileIconProps> = ({
  uri,
  size = 28,
  defaultImage = 'https://example.com/default-profile.png', // Replace with your fallback image URL
}) => {
  const dimensionStyle = `w-${size} h-${size} rounded-full`;

  return (
    <View className={`overflow-hidden bg-gray-300 ${dimensionStyle}`}>
      <Image
        source={{ uri: uri || defaultImage }}
        className={`w-full h-full`}
        resizeMode="cover"
      />
    </View>
  );
};


