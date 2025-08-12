import React from 'react';
import { View, TouchableOpacity, TextStyle } from 'react-native';
import { Event } from '@/types/allTypes';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DefaultProfilePicture from '../DefaultProfilePicture';

type AttendeeRowProps = {
  attendee: (NonNullable<Event['attendees']>)[number];
  isCreator: boolean;
  creatorId: string | undefined;
};

const AttendeeRow = React.memo<AttendeeRowProps>(({ attendee, isCreator, creatorId }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  const getStatusStyle = () => {
    switch (attendee.status) {
      case 'accepted':
        return {
          backgroundColor: themeColors.mountainGreen,
          borderColor: themeColors.mountainGreen,
          borderWidth: 1,
          color: themeColors.text
        };
      case 'maybe':
        return {
          backgroundColor: themeColors.maybeStatusColor + '50',
          borderColor: themeColors.maybeStatusColor,
          borderWidth: 1,
          color: 'white'
        };
      case 'rejected':
        return {
          backgroundColor: themeColors.background + '20',
          borderColor: themeColors.border,
          borderWidth: 1,
          color: themeColors.text
        };
      default:
        return {
          backgroundColor: themeColors.mountainGreen + '20',
          borderColor: themeColors.mountainGreen,
          borderWidth: 1,
          color: themeColors.text
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (attendee.status) {
      case 'rejected':
        return {
          textDecorationLine: 'line-through'
        };
      default:
        return {};
    }
  };

  const getStatusText = () => {
    switch (attendee.status) {
      case 'accepted':
        return 'Going';
      case 'maybe':
        return 'Maybe';
      case 'rejected':
        return 'Not Going';
      default:
        return 'Pending';
    }
  };

  const statusStyle = getStatusStyle();
  const textStyle = getTextStyle();

  const goToUserProfile = () => {
    if (attendee.user._id) {
      router.push({
        pathname: "/(auth)/profile/[_id]",
        params: { _id: attendee.user._id }
      });
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          flex: 1 
        }}
        onPress={goToUserProfile}
      >
        <View style={{ marginRight: 12 }}>
          <DefaultProfilePicture
            profilePicture={attendee.user.profile_picture}
            fullName={attendee.user.full_name}
            size={40}
            borderRadius={20}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText>{attendee.user.full_name}</ThemedText>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            alignSelf: 'flex-start',
            marginTop: 4,
            ...statusStyle
          }}>
            <ThemedText style={{ 
              fontSize: 8,
              fontWeight: 'bold',
              color: statusStyle.color,
              ...textStyle
            }}>
              {getStatusText()}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

AttendeeRow.displayName = 'AttendeeRow';

export default AttendeeRow;