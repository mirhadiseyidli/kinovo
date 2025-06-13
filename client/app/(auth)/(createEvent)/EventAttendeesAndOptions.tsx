import { ThemedView } from '@/components/ThemedView';
import Attendees from '@/components/CreateEvent/Attendees';
import Options from '@/components/CreateEvent/Options';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, Alert } from 'react-native';
import type { CreateEventTabParamList } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useEventCreatedMessage } from '@/context/EventCreatedMessageContext';

export default React.memo(function EventAttendeesAndOptions() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [limit, setLimit] = useState<number | null>(null);
  const { 
    validationErrors, 
    loading, 
    error, 
    createOrUpdateEvent,
    isEditMode
  } = useCreateEventContext();
  const { show } = useEventCreatedMessage();

  const handleSaveEvent = async () => {
    const response = await createOrUpdateEvent();
    
    if (response?.success) {
      navigation.getParent()?.goBack(); // This will close the modal
      show(isEditMode ? 'updated' : 'created');
    } else if (Object.keys(validationErrors).length > 0) {
      // Show first validation error
      const firstError = Object.values(validationErrors).find(error => error);
      if (firstError) {
        Alert.alert('Validation Error', firstError);
      }
    } else if (error) {
      Alert.alert('Error', error || 'An unknown error occurred');
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

        {/* Error message if any */}
        {error && (
          <View style={{ 
            backgroundColor: '#FFEBEE', 
            padding: 10, 
            borderRadius: 8, 
            marginTop: 10 
          }}>
            <Text style={{ color: '#C62828' }}>{error}</Text>
          </View>
        )}

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
            label={loading ? "" : isEditMode ? "Save Event" : "Create Event"}
            onPress={handleSaveEvent}
            disabled={loading}
            containerStyle={{ 
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: loading ? 30 : 16,
              borderRadius: 8,
              alignSelf: 'flex-end',
              opacity: loading ? 0.7 : 1
            }}
            textStyle={{
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            {loading && (
              <ActivityIndicator 
                size="small" 
                color={themeColors.text} 
                style={{ marginRight: 8 }} 
              />
            )}
          </ButtonWithLabel>
        </View>
      </ScrollView>
    </ThemedView>
  );
})