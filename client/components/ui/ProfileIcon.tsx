import React from 'react';
import { Image, View, ImageSourcePropType } from 'react-native';

const defaultProfilePic = require('../../assets/profile-picture.png'); // Ensure this path is correct

type ProfileIconProps = {
  uri?: string; // URL of the profile picture
  size?: number; // Size of the icon (default: 28)
  color?: string; // Background color for the placeholder
  defaultImage?: ImageSourcePropType; // Fallback image (local asset)
};

export const ProfileIcon: React.FC<ProfileIconProps> = ({
  uri,
  size = 28,
  color,
  defaultImage = defaultProfilePic,
}) => {
  const imageSource = uri ? { uri } : defaultImage; // Use defaultImage if uri is falsy

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2, // Define the border width
        borderColor: color, // Use the teal-400 color or a dynamic value
        padding: 2, // Add padding around the content
      }}
    >
      <Image
        source={imageSource}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
        tintColor={color}
      />
    </View>
  );
};