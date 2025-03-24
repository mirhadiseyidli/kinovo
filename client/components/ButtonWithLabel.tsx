import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';

interface ButtonWithLabelProps {
  label: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export const ButtonWithLabel: React.FC<ButtonWithLabelProps> = ({ label, onPress, containerStyle, textStyle }) => {

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        ...containerStyle
      }}
    >
      <Text style={{
        ...textStyle
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};