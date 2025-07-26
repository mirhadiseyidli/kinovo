import React from 'react';
import { View } from 'react-native';
import { Event } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import DefaultProfilePicture from '../DefaultProfilePicture';

type AttendeeAvatarProps = {
  attendee: (NonNullable<Event['attendees']>)[number];
  index: number;
};

const AttendeeAvatar = React.memo<AttendeeAvatarProps>(({ attendee, index }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{
      marginLeft: index > 0 ? -12 : 0,
      borderColor: themeColors.background,
      borderWidth: 2,
      borderRadius: 30,
    }}>
      <DefaultProfilePicture
        profilePicture={attendee.user.profile_picture}
        fullName={attendee.user.full_name}
        size={48}
        borderRadius={24}
      />
    </View>
  );
});

AttendeeAvatar.displayName = 'AttendeeAvatar';

export default AttendeeAvatar;