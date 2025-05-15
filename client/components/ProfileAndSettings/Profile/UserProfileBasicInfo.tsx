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
  instagram_username,
  facebook_username,
  number_of_friends,
  number_of_events
}: UserProfileBasicInfoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={{ flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 24, paddingHorizontal: 16 }}>
      <ThemedText style={{ fontWeight: 'bold', fontSize: 20, alignSelf: 'center' }}>{full_name}</ThemedText>
      <ThemedText style={{ fontSize: 14, alignSelf: 'center', color: themeColors.placeholderTextColor }}>{username}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <View style={{ flexDirection: 'column', alignItems: 'center', width: 'auto', marginVertical: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Friends</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>{number_of_friends || 0}</ThemedText>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'center', width: 'auto', marginVertical: 10 }}>
          <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>Events</ThemedText>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>{number_of_events || 0}</ThemedText>
        </View>
      </View>
      {(instagram_username || facebook_username) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          {instagram_username && (
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 'auto' }}>
              <Feather name="instagram" size={20} style={{ marginHorizontal: 10, color: themeColors.text }} />
              <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>{instagram_username}</ThemedText>
            </View>
          )}
          {facebook_username && (
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 'auto' }}>
              <Feather name="facebook" size={20} style={{ marginHorizontal: 10, color: themeColors.text }} />
              <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>{facebook_username}</ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default UserProfileBasicInfo;