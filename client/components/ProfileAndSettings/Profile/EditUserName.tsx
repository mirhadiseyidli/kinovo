import React from 'react';
import { View, Text, TextInput } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const UserNameEdit = ({
  label,
  value,
  onChangeText,
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  themeColors: any;
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View 
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>{label}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <TextInput 
          value={value} 
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          style={{
            fontSize: 16, 
            color: themeColors.text 
          }}
        />
      </View>
    </View>
  );
};

export default UserNameEdit;