import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { ButtonWithLabelProps } from '@/types/allTypes';

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