import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SuggestedEventProps {
  icon: string;
  title: string;
  location: string;
}

const SuggestedEvent: React.FC<SuggestedEventProps> = ({ icon, title, location }) => {
  const screenWidth = Dimensions.get('window').width;

  return (
    <View
      style={{ 
        width: screenWidth * 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, // Shadow only on the bottom
        shadowOpacity: 0.1,
        shadowRadius: 2, // Smooth shadow edges
        elevation: 3, // For Android
      }} // 90% of the screen width
      className="bg-teal-100 rounded-2xl p-4 my-2 self-start"
    >
      <View className='flex-row items-center'>
        {/* Event Icon */}
        <View className='mr-4'>
          <Feather name="calendar" size={20} color="#0d9488" />
        </View>

        {/* Event Details */}
        <View className="">
          <Text className="text-lg font-bold text-teal-700">{title}</Text>
          <Text className="text-teal-600">{location}</Text>
        </View>
      </View>
    </View>
  );
};

export default SuggestedEvent;