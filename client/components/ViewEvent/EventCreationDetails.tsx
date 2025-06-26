import React from 'react';
import { View, Image, Text } from 'react-native';
import { User } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import DefaultProfilePicture from '../DefaultProfilePicture';

const EventCreationDetails = (
  { event_creator, event_creation_time }: 
  { event_creator: User | null; event_creation_time: Date | null }
) => {

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ 
      flex: 1, 
      flexDirection: 'row', 
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }}>
      <View style={{ flexDirection: 'row', height: 32, alignItems: 'center', gap: 8 }}>
        <View style={{ 
          height: '100%', 
          aspectRatio: 1, 
          borderRadius: 999,
          borderColor: themeColors.mountainGreen,
          borderWidth: 1,
        }}>
          <DefaultProfilePicture
            profilePicture={event_creator?.profile_picture}
            fullName={event_creator?.full_name}
            size={32}
            borderRadius={16}
          />
        </View>
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <ThemedText style={{ fontSize: 10, color: themeColors.placeholderTextColor }}>Created by</ThemedText>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: themeColors.text }}>{event_creator?.full_name}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', height: '100%', justifyContent: 'flex-end', paddingVertical: 1 }}>
        <ThemedText style={{ fontSize: 10, color: themeColors.placeholderTextColor }}>
          {event_creation_time ? new Date(event_creation_time).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : ''}
        </ThemedText>
      </View>
    </View>
  );
};

export default React.memo(EventCreationDetails);