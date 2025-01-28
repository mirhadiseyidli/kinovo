import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CategoryProps {
  iconName: any;
  label: string;
  iconColor: string;
}

const Category: React.FC<CategoryProps> = ({ iconName, label, iconColor }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemedView 
      className="flex-1 w-full items-center justify-center"
      style={{
        borderRadius: 16, // Match the rounded corners of the child
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        backgroundColor: 'transparent', // Make sure the shadow is visible
        alignSelf: 'center', // Center horizontally
        marginVertical: 8,
      }}
    >
      <ThemedView
        className="overflow-hidden rounded-sm"
        style={{
          borderRadius: 16, // Rounded corners
          aspectRatio: 1
        }}
      >
        <ThemedView className="p-4 items-center justify-center">
          <Feather name={iconName} size={28} color={iconColor} />
          <ThemedText className="text-sm font-medium text-gray-900 mt-2">{label}</ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default Category;