import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, Stack } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { ReactNode } from "react";
import { LocationProvider } from '@/context/LocationContext'; // ✅ Import LocationProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { EventCreatedMessageProvider } from "@/context/EventCreatedMessageContext";
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { cancelAnimation } from 'react-native-reanimated';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Declare shared values in a scope accessible to listeners
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  const shareEvent = () => {
    return(
      <TouchableOpacity onPress={() => console.log('sharing')}>
        <Feather name="share-2" color={themeColors.text} size={24} />
      </TouchableOpacity>
    )
  }

  return (
    <LocationProvider>
      <EventCreatedMessageProvider>
        <Stack
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="(createEvent)"
            options={{ 
              title: 'Create Event',
              presentation: 'modal', 
              headerShown: true,
              headerStyle: { 
                backgroundColor: themeColors.background
              },
              headerTintColor: themeColors.text,
              headerTitleStyle: {
                fontWeight: 'bold'
              }
            }}
          />
          <Stack.Screen 
            name="(aboutUser)"
            options={{ 
              headerShown: true,
              headerStyle: { 
                backgroundColor: themeColors.background
              },
              headerTintColor: themeColors.text,
              headerTitleStyle: {
                fontWeight: 'bold'
              }
            }}
          />
          <Stack.Screen 
            name="(viewEvent)/[event_id]"
            options={{ 
              title: 'Event Details',
              presentation: 'modal', 
              gestureEnabled: true,
              gestureDirection: 'vertical',
              headerShown: true,
              headerStyle: { 
                backgroundColor: themeColors.background
              },
              headerTintColor: themeColors.text,
              headerTitleStyle: {
                fontWeight: 'bold'
              },
              headerRight: () => shareEvent()
            }}
          />
          <Stack.Screen 
            name="(friendsStory)/[story_id]"
            options={{
              presentation: 'card', // ✅ supports swipe
              gestureEnabled: true,
              gestureDirection: 'vertical',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
            listeners={{
              blur: () => {
                'worklet';
                cancelAnimation(translateX);
                cancelAnimation(translateY);
                translateX.value = 0;
                translateY.value = 0;
                gestureActive.value = false;
              },
              beforeRemove: () => {
                'worklet';
                cancelAnimation(translateX);
                cancelAnimation(translateY);
                translateX.value = 0;
                translateY.value = 0;
                gestureActive.value = false;
              },
            }}
          />
        </Stack>
      </EventCreatedMessageProvider>
    </LocationProvider>
  );
}