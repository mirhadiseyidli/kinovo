import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { DeleteAccountProps } from '@/types/allTypes';

const DeleteAccountComponent: React.FC<DeleteAccountProps> = ({ onPress }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
      <AntDesign name="deleteuser" size={24} color={themeColors.specialRed} />
      <ThemedText style={{ marginLeft: 10, fontSize: 16, color: themeColors.specialRed }}>Delete Account</ThemedText>
    </TouchableOpacity>
  );
};

export default DeleteAccountComponent;
