import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, View } from 'react-native';
import { ButtonWithLabelProps } from '@/types/allTypes';

export const ButtonWithLabel: React.FC<ButtonWithLabelProps> = ({ 
  label, 
  onPress, 
  containerStyle, 
  textStyle, 
  disabled,
  children 
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        ...containerStyle
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {children}
        {label && (
          <Text style={{
            ...textStyle
          }}>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};