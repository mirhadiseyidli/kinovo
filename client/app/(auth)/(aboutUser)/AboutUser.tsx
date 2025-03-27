import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import EventImage from '@/components/CreateEvent/EventImage';
import Category from '@/components/CreateEvent/EventType';
import Description from '@/components/CreateEvent/Description';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons, Feather, Octicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import type { User, UserProp } from '@/types/allTypes';

export default React.memo(function AboutUser({ user }: UserProp) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1, padding: 16, height: 'auto' }}>
      <View>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.placeholderTextColor, marginBottom: 8 }}>Bio</ThemedText>
        {user.bio ? (
          <ThemedText style={{ fontSize: 16 }}>{user.bio}</ThemedText>
        ) : (
          <ThemedText style={{ fontSize: 16, color: themeColors.placeholderTextColor }}>
            {"This user hasn't shared their vibe yet—stay tuned!"}
          </ThemedText>
        )}
        {user.location?.text && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16, alignItems: 'center' }}>
            <Feather name='map-pin' color={themeColors.placeholderTextColor} size={16}/>
            <ThemedText style={{ fontSize: 16 }}>{user.location.text}</ThemedText>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 16, alignItems: 'center' }}>
          <Feather name='clock' color={themeColors.placeholderTextColor} size={16}/>
          <ThemedText style={{ fontSize: 16 }}>
            {`Member for ${formatDistanceToNow(new Date(user.created_at), { addSuffix: false })}`}
          </ThemedText>
          <ThemedText style={{ fontSize: 16, marginHorizontal: 4 }}>·</ThemedText>
          <ThemedText style={{ fontSize: 16 }}>
            {`Joined on ${new Date(user.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}`}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'column', marginTop: 16 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.placeholderTextColor, marginBottom: 12 }}>Favorite Activities</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {user.favorite_activities && user.favorite_activities.length > 0 ? (
              user.favorite_activities.map((activity, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: themeColors.mountainGreen,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <ThemedText style={{ fontSize: 14, color: themeColors.text }}>
                    {activity}
                  </ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={{ fontSize: 16, color: themeColors.placeholderTextColor }}>
                {`No favorite activities yet—this user’s still discovering their passions!`}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    </ThemedView>
  );
});