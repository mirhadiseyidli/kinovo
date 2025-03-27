import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FavoriteActivity from '@/components/ProfileAndSettings/Profile/FavoriteActivity';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { FavoriteActivitiesProps } from '@/types/allTypes';

const FavoriteActivities: React.FC<FavoriteActivitiesProps> = ({ activities }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Favorite Activities</ThemedText>
        <TouchableOpacity 
          onPress={() => console.log('pressed')}
          style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <ThemedText style={{ fontSize: 14, marginRight: 4 }}>View All</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
        </TouchableOpacity>
      </View>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <FavoriteActivity key={index} activity={activity} />
          ))
        ) : (
          <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, textAlign: 'center' }}>
            Edit your profile to add your favorite activities.
          </ThemedText>
        )}
      </View>
    </View>
  );
};

export default FavoriteActivities;
