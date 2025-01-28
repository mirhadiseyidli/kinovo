import React from 'react';
import { TouchableOpacity, Image, Alert, ImageSourcePropType } from 'react-native';

interface AuthButtonProps {
  onPress: () => void; // Function to handle button press
  logo: ImageSourcePropType; // Path to the logo image
  backgroundColor?: string; // Optional background color
}

const AuthButton: React.FC<AuthButtonProps> = ({ onPress, logo, backgroundColor = 'bg-white' }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-shrink h-[60%] aspect-square ${backgroundColor} rounded-full items-center justify-center shadow-lg active:shadow-none`}
    >
      <Image
        source={logo} // Logo for the button
        className="w-[50%] h-[50%]"
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default AuthButton;