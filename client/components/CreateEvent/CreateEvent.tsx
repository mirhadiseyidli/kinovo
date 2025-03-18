import React, { useState } from 'react';
import { Button, Animated, Easing, Dimensions, TouchableOpacity, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
import Frequency from './Frequency';

const { width } = Dimensions.get('window'); // Get screen width dynamically

const CreateEvent: React.FC = () => {
  const colorScheme = useColorScheme();
  const [eventType, setEventType] = useState<string | undefined>(undefined);
  const [step, setStep] = useState(1);
  const scrollY = useState(new Animated.Value(0))[0];
  const [stepIndicatorAnim] = useState(new Animated.Value(0));

  const translateX = stepIndicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -width, -2 * width], // Ensure exact positioning without flicker
    extrapolate: "clamp",
  });

  const stepTitles = ["Event Details", "Date & Location", "Attendees & Options"];

  const titleBackgroundColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.5)"], // Transparent to grayish background
    extrapolate: "clamp",
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(prevStep => prevStep + 1); // Update step immediately

      Animated.timing(stepIndicatorAnim, {
        toValue: step, // Sync with step index
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prevStep => prevStep - 1); // Update step immediately

      Animated.timing(stepIndicatorAnim, {
        toValue: step - 2, // Sync with step index
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Fixed Title */}
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingVertical: 12,
        backgroundColor: titleBackgroundColor,
        alignItems: 'center',
        zIndex: 10,
      }}>
        <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: Colors[colorScheme ?? 'dark'].text }}>
          Create Event
        </ThemedText>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1, padding: 16, marginTop: 30 }} // Push content below fixed title
        nestedScrollEnabled={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Step Indicator */}
        <ThemedView style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 26 }}>
          <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, width: '100%' }}>
            {stepTitles.map((title, index) => (
              <ThemedView key={index} style={{ alignItems: 'center', width: '32%', justifyContent: 'space-between', gap: 4 }}>
                <ThemedView
                  style={{
                    width: '100%',
                    height: 6,
                    backgroundColor: index === step - 1 ? Colors[colorScheme ?? 'dark'].text : Colors[colorScheme ?? 'dark'].inputBackgroundColor,
                    borderRadius: 3,
                  }}
                />
                <ThemedText 
                  style={{ 
                    fontSize: 12,
                    marginTop: 4,
                    color: index === step - 1 ? Colors[colorScheme ?? 'dark'].text : Colors[colorScheme ?? 'dark'].inputBackgroundColor,
                  }}
                >
                  {title}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Animated Content */}
        <Animated.View style={{ 
          flexDirection: 'row', 
          transform: [{ translateX }], 
          gap: 32, 
          backgroundColor: 'blue',
          flexGrow: 1, // Allows it to grow based on content
          alignItems: 'flex-start', // Ensures dynamic alignment
        }}>
          <ThemedView style={{ width: '100%' }}>
              {/* Step 1: Event Details */}
            <EventImage eventType={eventType} />
            <EventName />
            <Category onCategorySelect={setEventType} />
            <Description />
          </ThemedView>

          <ThemedView style={{ width: '100%' }}>
            {/* Step 2: Date & Location */}
            <DateTime />
            <Location />
            <Frequency />
          </ThemedView>

          <ThemedView style={{ width: '100%' }}>
            {/* Step 3: Attendees & Options */}
            <Attendees />
            <Options />
          </ThemedView>
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={{
          flexDirection: 'row',
          justifyContent: step > 1 ? 'space-between' : 'flex-end',
          marginBottom: 32, // Extra space at the bottom to avoid cutoff
        }}>
          {step > 1 && (
            <TouchableOpacity
              style={{
                backgroundColor: Colors[colorScheme ?? 'dark'].inputBackgroundColor,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}
              onPress={handleBack}
            >
              <Text style={{ color: Colors[colorScheme ?? 'dark'].text, fontWeight: 'bold' }}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
            onPress={step < 3 ? handleNext : () => console.log("Event Created")}
          >
            <Text style={{ color: Colors[colorScheme ?? 'dark'].text, fontWeight: 'bold' }}>{step < 3 ? "Next" : "Create Event"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </ThemedView>
  );
};

export default CreateEvent;