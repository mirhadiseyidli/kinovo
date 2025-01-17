import React from 'react';
import { View, Text } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface ActivityProps {
  friendName: string;
  activityTitle: string;
  date: string;
  time: string;
  description: string;
}

const Activity: React.FC<ActivityProps> = ({
  friendName,
  activityTitle,
  date,
  time,
  description,
}) => {
  return (
    <View className="mb-6">
      {/* Friend and Activity */}
      <Text className="text-teal-600 font-bold">
        {friendName} is attending {activityTitle}
      </Text>

      {/* Date and Time */}
      <Text className="text-gray-500">{`${date} at ${time}`}</Text>

      {/* Description */}
      <Text className="text-gray-700">{description}</Text>
    </View>
  );
};

export default Activity;