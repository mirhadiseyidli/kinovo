import React, { useState } from 'react';
import { TouchableOpacity, Image, ImageSourcePropType, Dimensions, LayoutChangeEvent } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AuthButtonProps } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const AuthButton: React.FC<AuthButtonProps & { disabled?: boolean }> = ({ onPress, logo, backgroundColor='white', disabled }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [buttonHeight, setButtonHeight] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setButtonHeight(height);
  };

  const logoHeight = (buttonHeight * 50) / 100;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      onLayout={handleLayout}
      style={{
        height: 72,
        aspectRatio: 1, // Keeps it square
        backgroundColor,
        borderRadius: 16, // Makes it fully rounded
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
      <FontAwesome name={logo} color={themeColors.text} size={logoHeight} />
    </TouchableOpacity>
  );
};

export default AuthButton;