import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import EventImage from '@/components/CreateEvent/EventImage';
import Category from '@/components/CreateEvent/EventType';
import Description from '@/components/CreateEvent/Description';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { CreateEventTabParamList } from '@/types/allTypes';

export default React.memo(function EventDetails() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [eventType, setEventType] = useState<string | undefined>(undefined);

  const navigateToNext = () => {
    navigation.navigate('Date & Location');
  };

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <ScrollView>
        {/* Step 1: Event Details */}
        <EventImage eventType={eventType} />
        <EventName />
        <Category onCategorySelect={setEventType} />
        <Description />

        {/* Next Button */}
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
        </ScrollView>
    </ThemedView>
  );
});