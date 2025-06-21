import React from 'react';
import { View, Image, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { UserProfileBasicInfoProps } from '@/types/allTypes';

const UserProfileBasicInfo = ({
  full_name,
  username,
  number_of_friends,
  number_of_events,
  number_of_activities
}: UserProfileBasicInfoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'column', gap: 8, paddingHorizontal: 16, width: '100%' }}>
      <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>{full_name}</ThemedText>
      <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>{username}</ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'column', width: 'auto', marginTop: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Events</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', alignSelf: 'center' }}>{number_of_events || 0}</ThemedText>
        </View>
        <View style={{ flexDirection: 'column', width: 'auto', marginTop: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Friends</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', alignSelf: 'center' }}>{number_of_friends || 0}</ThemedText>
        </View>
        <View style={{ flexDirection: 'column', width: 'auto', marginTop: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Activities</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', alignSelf: 'center' }}>{number_of_activities || 0}</ThemedText>
        </View>
      </View>
    </View>
  );
};

export default UserProfileBasicInfo;