import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';

const SearchButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <ThemedView>
        <Feather name="search" size={24} color="black" />
      </ThemedView>
    </TouchableOpacity>
  );
};

export default SearchButton;