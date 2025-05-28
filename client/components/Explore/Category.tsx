import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ExploreCategoryProps } from '@/types/allTypes';

const Category: React.FC<ExploreCategoryProps> = ({ iconName, label, iconColor, onPress }) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        backgroundColor: 'transparent',
        alignSelf: 'center',
        marginVertical: 8,
      }}
    >
      <ThemedView
        style={{
          overflow: 'hidden',
          borderRadius: 16, // Rounded corners
          aspectRatio: 1,
        }}
      >
        <ThemedView
          style={{
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name={iconName} size={28} color={iconColor} />
          <ThemedText style={{ fontSize: 12, fontWeight: '500', marginTop: 8 }}>
            {label}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
};

export default Category;