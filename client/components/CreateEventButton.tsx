import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';

const CreateEventButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <ThemedView className="w-10 h-10 bg-teal-500 rounded-full justify-center items-center">
        <Feather name="plus" size={20} color="white" />
      </ThemedView>
    </TouchableOpacity>
  );
};

export default CreateEventButton;