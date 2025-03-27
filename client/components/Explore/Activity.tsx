import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ActivityProps } from '@/types/allTypes';

const Activity: React.FC<ActivityProps> = ({
  friendName,
  friendImage,
  activityTitle,
  eventTitle,
  date,
  time,
  location,
}) => {
  return (
    <ThemedView
      style={{
        marginBottom: 16, // Spacing between activities
        alignSelf: 'center', // Center content horizontally
        width: '100%', // Full width
      }}
    >
      {/* Friend Information */}
      <ThemedView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Image
          source={friendImage}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 12,
          }}
        />
        <ThemedView>
          <ThemedText style={{ fontWeight: 'bold', color: '#1F2937' }}>{friendName}</ThemedText>
          <ThemedText style={{ color: '#6B7280', fontSize: 14 }}>{activityTitle}</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Event Card */}
      <ThemedView
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2, // For Android
          backgroundColor: 'transparent', // Ensure shadow is visible
          borderRadius: 12, // Match rounded corners of the child
        }}
      >
        <ThemedView
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#F3F4F6',
            padding: 16,
          }}
        >
          <ThemedText style={{ fontWeight: 'bold', color: '#1F2937', marginBottom: 8 }}>
            {eventTitle}
          </ThemedText>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="map-pin" size={16} color="#6B7280" />
            <ThemedText style={{ fontSize: 14, color: '#6B7280', marginLeft: 8 }}>
              {location}
            </ThemedText>
          </ThemedView>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={16} color="#6B7280" />
            <ThemedText style={{ fontSize: 14, color: '#6B7280', marginLeft: 8 }}>
              {date}, {time}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default Activity;