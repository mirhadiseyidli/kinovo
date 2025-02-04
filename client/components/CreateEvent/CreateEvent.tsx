import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import DateTime from '@/components/CreateEvent/DateTime';
import Location from '@/components/CreateEvent/Location';
import Description from '@/components/CreateEvent/Description';
import Attendees from '@/components/CreateEvent/Attendees';
import Options from '@/components/CreateEvent/Options';
import Category from '@/components/CreateEvent/EventType';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventImage from '@/components/CreateEvent/EventImage';

const CreateEvent: React.FC = () => {
  const colorScheme = useColorScheme();
  const [eventType, setEventType] = useState<string | undefined>(undefined);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <ThemedView style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
        <ThemedText style={{ fontSize: 14, fontWeight: 'bold' }}>Create Event</ThemedText>
      </ThemedView>
      <EventImage eventType={eventType} />
      <EventName />
      <Category onCategorySelect={setEventType} />
      <DateTime />
      <Location />
      <Attendees />
      <Description />
      <Options />
    </ScrollView>
  );
};

export default CreateEvent;