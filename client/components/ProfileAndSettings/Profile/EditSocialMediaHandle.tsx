import React from 'react';
import { View, Text, TextInput, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { EditSocialMediaHandleProps } from '@/types/allTypes';

const EditSocialMediaHandle = ({ label, value, onChangeText, iconName }: EditSocialMediaHandleProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View 
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <Feather name={iconName} color={themeColors.text} size={24} style={{ marginRight: 8}} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>{label}</Text>
      </View>
      <View 
        style={{
          flex: 1
        }}
      >
        <TextInput 
          value={value} 
          onChangeText={onChangeText}
          placeholder='Username'
          placeholderTextColor={themeColors.placeholderTextColor}
          autoCapitalize='none'
          style={{
            fontSize: 16, 
            color: themeColors.text 
          }}
        />
      </View>
    </View>
  );
};

export default EditSocialMediaHandle;