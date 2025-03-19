import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface FavoriteActivityProps {
  activity: string;
}

const FavoriteActivity: React.FC<FavoriteActivityProps> = ({ activity }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <TouchableOpacity 
      style={{ 
        backgroundColor: themeColors.mountainGreen, 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 20, 
        marginRight: 8, 
        marginBottom: 8 
      }}
    >
      <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '500' }}>
        {activity}
      </Text>
    </TouchableOpacity>
  );
};

export default FavoriteActivity;
