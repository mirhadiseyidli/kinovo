import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SearchButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <View>
        <Feather name="search" size={24} color="black" />
      </View>
    </TouchableOpacity>
  );
};

export default SearchButton;