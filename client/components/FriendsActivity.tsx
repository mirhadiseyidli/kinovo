import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import Activity from './Activity';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const FriendsActivity: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const screenHeight = Dimensions.get('window').height;

  const activities = [
    {
      id: 1,
      friendName: 'Sarah',
      activityTitle: 'City Bike Tour',
      date: '2023-07-18',
      time: '10:00 AM',
      description:
        'Join Sarah and 15 others for an exciting bike tour around the city! Discover hidden gems and enjoy the urban landscape.',
    },
    {
      id: 2,
      friendName: 'Mike',
      activityTitle: 'Beach Cleanup',
      date: '2023-07-20',
      time: '08:00 AM',
      description:
        'Help Mike and the local community keep our beaches clean and beautiful.',
    },
    {
      id: 3,
      friendName: 'Emily',
      activityTitle: 'Yoga in the Park',
      date: '2023-07-21',
      time: '07:00 AM',
      description:
        'Start your day right with Emily and fellow yoga enthusiasts in the serene city park.',
    },
    {
      id: 4,
      friendName: 'Alex',
      activityTitle: 'Rock Climbing Workshop',
      date: '2023-07-22',
      time: '02:00 PM',
      description:
        'Learn the basics of rock climbing with Alex and experienced instructors.',
    },
    {
      id: 5,
      friendName: 'Olivia',
      activityTitle: 'Charity Run',
      date: '2023-07-23',
      time: '09:00 AM',
      description:
        'Join Olivia in a 5K run to raise funds for the local animal shelter.',
    },
    {
      id: 6,
      friendName: 'Daniel',
      activityTitle: 'Photography Walk',
      date: '2023-07-24',
      time: '04:00 PM',
      description:
        'Explore the city\'s most photogenic spots with Daniel and other photography enthusiasts.',
    },
    {
      id: 7,
      friendName: 'Sophia',
      activityTitle: 'Cooking Class',
      date: '2023-07-25',
      time: '06:00 PM',
      description:
        'Learn to cook delicious, healthy meals with Sophia and a professional chef.',
    },
  ];

  return (
    <View className="flex-1 p-4 bg-white">
      {/* Header */}
      <Text className="text-lg font-bold mb-4">Friends' Activity</Text>

      {/* Scrollable Activities */}
      <ScrollView ref={scrollViewRef} className="flex-1">
        {activities.map((activity) => (
          <Activity
            key={activity.id}
            friendName={activity.friendName}
            activityTitle={activity.activityTitle}
            date={activity.date}
            time={activity.time}
            description={activity.description}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default FriendsActivity;