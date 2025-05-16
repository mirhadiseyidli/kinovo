import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import DateTime from '@/components/CreateEvent/DateTime';
import LocationComponent from '@/components/CreateEvent/Location';
import Frequency from '@/components/CreateEvent/Frequency';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { CreateEventTabParamList } from '@/types/allTypes';

export default React.memo(function EventDateAndLocation() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const navigateToNext = () => {
    navigation.navigate('Attendees & Options');
  };

  const navigateToBack = () => {
    navigation.navigate('Details');
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
      <ScrollView
        contentContainerStyle={{ gap: 16 }}
      >
        {/* Step 2: Date & Location */}
        <DateTime />
        <LocationComponent />
        <Frequency />
        {/* Back and Next Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ButtonWithLabel 
            label="Back"
            onPress={navigateToBack}
            containerStyle={{ 
              backgroundColor: themeColors.inputBackgroundColor,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignSelf: 'flex-start',
            }}
            textStyle={{
              fontWeight: 'bold',
              color: themeColors.text
            }}
          />
          <ButtonWithLabel 
            label="Next"
            onPress={navigateToNext}
            containerStyle={{ 
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignSelf: 'flex-end',
            }}
            textStyle={{
              fontWeight: 'bold',
              color: themeColors.text
            }}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
});