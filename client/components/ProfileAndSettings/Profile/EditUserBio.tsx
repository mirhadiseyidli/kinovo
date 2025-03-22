import React from 'react';
import { View, Text, TextInput, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const EditUserBio = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  return (
    <View 
      style={{
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          width: '100%',
          justifyContent: 'flex-start'
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text, alignSelf: 'flex-start' }}>{label}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          height: screenWidth / 5, // One-third of screen height
          alignItems: 'flex-start'
        }}
      >
        <TextInput 
          value={value} 
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderTextColor}
          multiline={true}
          maxLength={150}
          numberOfLines={4}
          style={{
            flex: 1,
            fontSize: 16, 
            color: themeColors.text 
          }}
        />
      </View>
    </View>
  );
};

export default EditUserBio;