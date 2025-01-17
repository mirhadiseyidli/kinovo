import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons'; // Using Feather icons

const MenuButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <View>
        <Feather name="menu" size={24} color="black" />
      </View>
    </TouchableOpacity>
  );
};

export default MenuButton;