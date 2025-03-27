import React from 'react';
import { TouchableOpacity, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AuthButtonProps } from '@/types/allTypes';

const { width } = Dimensions.get('window');

// Function to calculate button size dynamically based on screen width
const getSize = (percentage: number) => (width * percentage) / 100;

const AuthButton: React.FC<AuthButtonProps> = ({ onPress, logo, backgroundColor='white' }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexShrink: 1,
        height: '70%',
        aspectRatio: 1, // Keeps it square
        backgroundColor,
        borderRadius: 9999, // Makes it fully rounded
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5, // Android shadow
      }}
      activeOpacity={0.8} // ✅ Fix: activeOpacity moved outside of style
    >
      <Image
        source={logo}
        style={{
          width: getSize(7), // 7% of screen width
          height: getSize(7), // Keep same aspect ratio
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default AuthButton;