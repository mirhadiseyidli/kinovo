import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const ProfileButton: React.FC = () => {
  return (
    <TouchableOpacity>
      <View className="w-9 h-9 border border-gray-300 rounded-lg justify-center items-center">
        <Feather name="user" size={24} color="black" />
      </View>
    </TouchableOpacity>
  );
};

export default ProfileButton;