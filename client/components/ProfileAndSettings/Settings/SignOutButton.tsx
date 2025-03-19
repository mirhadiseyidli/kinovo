import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Octicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';

interface SignOutItemProps {
  onPress: () => void;
}

const SignOutComponent: React.FC<SignOutItemProps> = ({ onPress }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
      <Octicons name='sign-out' size={24} style={{ color: '#ef4444' }} />
      <ThemedText style={{ marginLeft: 10, fontSize: 16, color: '#ef4444' }}>Sign Out</ThemedText>
    </TouchableOpacity>
  );
};

export default SignOutComponent;
