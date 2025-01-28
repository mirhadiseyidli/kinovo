import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import Activity from '@/components/Explore/Activity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const profilePic1 = require('@/assets/profile-pic-1.webp');
const profilePic2 = require('@/assets/profile-pic-2.jpeg');
const { height: screenHeight } = Dimensions.get('window');

const FriendsActivity: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dynamicPadding = Math.min(Math.max(screenHeight * 0.05, 1), Math.max(screenHeight * 0.05, 10));
  const activities = [
    {
      id: 1,
      friendName: 'Sarah',
      friendImage: profilePic1, // Replace with actual image URL
      activityTitle: 'is attending Tech Summit',
      eventTitle: 'Tech Summit 2025',
      location: 'Convention Center, NYC',
      date: 'March 15, 2025',
      time: '9:00 AM',
    },
    {
      id: 2,
      friendName: 'Mike',
      friendImage: profilePic2, // Replace with actual image URL
      activityTitle: 'is going to Jazz Night',
      eventTitle: 'Jazz Night',
      location: 'Blue Note Jazz Club',
      date: 'February 24, 2025',
      time: '8:00 PM',
    },
    {
      id: 3,
      friendName: 'Sarah',
      friendImage: profilePic1, // Replace with actual image URL
      activityTitle: 'is attending Tech Summit',
      eventTitle: 'Tech Summit 2025',
      location: 'Convention Center, NYC',
      date: 'March 15, 2025',
      time: '9:00 AM',
    },
    {
      id: 4,
      friendName: 'Mike',
      friendImage: profilePic2, // Replace with actual image URL
      activityTitle: 'is going to Jazz Night',
      eventTitle: 'Jazz Night',
      location: 'Blue Note Jazz Club',
      date: 'February 24, 2025',
      time: '8:00 PM',
    },
  ];

  return (
    <ThemedView className="flex-1 p-4 bg-white w-full">
      {/* Header */}
      <ThemedText className="text-lg font-bold text-gray-900 mb-4">Friends' Activity</ThemedText>

      {/* Activities List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + dynamicPadding, // Add extra padding for the tab bar height
        }}
      >
        {activities.map((activity) => (
          <Activity
            key={activity.id}
            friendName={activity.friendName}
            friendImage={activity.friendImage}
            activityTitle={activity.activityTitle}
            eventTitle={activity.eventTitle}
            date={activity.date}
            time={activity.time}
            location={activity.location}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
};

export default FriendsActivity;