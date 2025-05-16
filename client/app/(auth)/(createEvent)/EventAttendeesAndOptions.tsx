import { ThemedView } from '@/components/ThemedView';
import Attendees from '@/components/CreateEvent/Attendees';
import Options from '@/components/CreateEvent/Options';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { CreateEventTabParamList } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useCreateEvent } from '@/hooks/useCreateEvent';
import { useEventCreatedMessage } from '@/context/EventCreatedMessageContext';

export default React.memo(function EventAttendeesAndOptions() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [limit, setLimit] = useState<number | null>(null);
  const { compileEventData } = useCreateEventContext();
  const { postCreateEvent } = useCreateEvent();
  const { show } = useEventCreatedMessage();

  const createEvent = async () => {
    const eventData = compileEventData();
    const response = await postCreateEvent(eventData);
[]
    if (response?.success) {
      navigation.getParent()?.goBack(); // 👈 This will close the modal
      show();
    }
  };

  const navigateToBack = () => {
    navigation.navigate('Date & Location');
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
      <ScrollView 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps={'always'}
        contentContainerStyle={{ gap: 16 }}
      >
        {/* Step 3: Attendees & Options */}
        <Options setLimit={setLimit}/>
        <Attendees limit={limit} />

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
              zIndex: -1
            }}
            textStyle={{
              fontWeight: 'bold',
              color: themeColors.text
            }}
          />
          <ButtonWithLabel 
            label="Create Event"
            onPress={createEvent}
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
})