import React, { useState } from 'react';
import { TouchableOpacity, Image, ImageSourcePropType, Dimensions, LayoutChangeEvent } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AuthButtonProps } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const AuthButton: React.FC<AuthButtonProps & { disabled?: boolean }> = ({ onPress, logo, backgroundColor='white', disabled, oauth_type }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [buttonHeight, setButtonHeight] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setButtonHeight(height);
  };

  const logoHeight = (buttonHeight * 40) / 100;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      onLayout={handleLayout}
      style={{
        flexDirection: 'row',
        gap: 8,
        width: '100%',
        paddingVertical: 16,
        // height: 72,
        // aspectRatio: 1, // Keeps it square
        backgroundColor: colorScheme === 'dark' ? '#333333' : '#DEDDD0',
        borderRadius: 16, // Makes it fully rounded
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.8}
    >
      <FontAwesome name={logo} color={themeColors.text} size={logoHeight} />
      <ThemedText style={{ fontSize: 16 }}>Continue with {oauth_type}</ThemedText>
    </TouchableOpacity>
  );
};

export default AuthButton;