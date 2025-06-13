import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Redirect, router, Stack, useNavigation } from 'expo-router';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { ReactNode } from "react";
import { LocationProvider } from '@/context/LocationContext'; // ✅ Import LocationProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { EventCreatedMessageProvider } from "@/context/EventCreatedMessageContext";
import { EventProvider } from '@/context/EventContext';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { cancelAnimation } from 'react-native-reanimated';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { NotificationProvider } from "@/context/NotificationContext";
import ContextMenuWithTrigger from "@/components/ContextMenuWithTrigger";
import { useManageFriends } from "@/hooks/useManageFriends";
import api from "@/utils/api";
import { jwtDecode } from "jwt-decode";
import { CustomJwtPayload } from '@/types/allTypes';
import { CreateEventProvider } from "@/context/CreateEventContext";

export default function RootLayout(): ReactNode {
  const { accessToken, isLoading } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const params = useLocalSearchParams();
  const profileUserId = typeof params._id === 'string' ? params._id : params._id?.[0];

  // Shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(0);

  const {
    removeFriendFromFriendList
  } = useManageFriends();
  

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!accessToken?.current) {
    return <Redirect href="/login" />;
  }

  const shareEvent = () => {
    return(
      <TouchableOpacity>
        <Feather name="share-2" color={themeColors.text} size={20} />
      </TouchableOpacity>
    )
  }

  return (
      <Stack
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="(createEvent)"
          options={{ 
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
            headerRight: () => shareEvent(),
            animationDuration: 200,  // Speed up the animation
            animationTypeForReplace: 'pop',  // Better animation for rapid replacements
            freezeOnBlur: true,  // Prevent state updates when screen is blurred
          }}
          listeners={{
            blur: () => {
              'worklet';
              // Cleanup on blur
              translateX.value = 0;
              translateY.value = 0;
              gestureActive.value = 0;
            },
            beforeRemove: () => {
              'worklet';
              // Cleanup before removal
              translateX.value = 0;
              translateY.value = 0;
              gestureActive.value = 0;
            },
          }}
        />
      </Stack>
  );
}