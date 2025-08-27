import React from 'react';
import { TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { SaveUserChangesButtonProps } from '@/types/allTypes';

const SaveUserChangesButton = ({ isLoading, onPress }: SaveUserChangesButtonProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  return (
    <TouchableOpacity 
        onPress={onPress}
        style={{ 
          flex: 1,
          width: '90%', 
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 8,
          backgroundColor: isLoading ? themeColors.inputBackgroundColor : themeColors.mountainGreen,
          marginTop: 48,
          padding: 10, 
          justifyContent: 'center'
        }} 
          disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size={24} color={themeColors.text} />
        ) : (
          <>
            <Feather name='save' size={24} style={{ color: 'white', marginRight: 8 }} />
            <ThemedText style={{ fontSize: 16, color: 'white', fontWeight: 'bold' }}>Save</ThemedText>
          </>
        )}
      </TouchableOpacity>
  );
};

export default SaveUserChangesButton;