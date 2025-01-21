import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons'; // Using Feather icons
import { ThemedView } from './ThemedView';

const MenuButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <ThemedView>
        <Feather name="menu" size={24} color="black" />
      </ThemedView>
    </TouchableOpacity>
  );
};

export default MenuButton;