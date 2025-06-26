import React, { useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDateAndLocation from '@/app/(auth)/(createEvent)/EventDateAndLocation';
import EventDetails from '@/app/(auth)/(createEvent)/EventDetails';
import EventAttendeesAndOptions from '@/app/(auth)/(createEvent)/EventAttendeesAndOptions';
import { CreateEventProvider, useCreateEventContext } from '@/context/CreateEventContext';
import { useNavigation, useRouter } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window'); // Get screen width dynamically

// Create a context for sharing scroll state between tabs
export const CreateEventScrollContext = React.createContext<{
  bounceCompleted: { value: boolean };
  wasDraggingAtTop: { value: boolean };
  isDismissing: { value: boolean };
  handleDismiss: () => void;
}>({
  bounceCompleted: { value: false },
  wasDraggingAtTop: { value: false },
  isDismissing: { value: false },
  handleDismiss: () => {},
});

// Inner component that has access to the context
function TabsNavigator() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { isEditMode } = useCreateEventContext();
  const navigation = useNavigation();
  const router = useRouter();

  // Shared scroll state for all tabs
  const bounceCompleted = useSharedValue(false);
  const wasDraggingAtTop = useSharedValue(false);
  const isDismissing = useSharedValue(false);

  // Handle dismissal at the parent level
  const handleDismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.dismissAll();
    }
  }, [router]);

  // Update the header title based on edit mode
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Event' : 'Create Event',
    });
  }, [isEditMode, navigation]);

  return (
    <CreateEventScrollContext.Provider value={{
      bounceCompleted,
      wasDraggingAtTop,
      isDismissing,
      handleDismiss,
    }}>
      <ThemedView style={{ flex: 1 }}>
        <Tab.Navigator
          // If you have multiple tabs, specify the initial route if needed:
          initialRouteName="Details"
          screenOptions={{
            tabBarIndicatorContainerStyle: {
              justifyContent: 'center',
              alignItems: 'center',
            },
            tabBarStyle: {
              backgroundColor: themeColors.background,
            },
            tabBarIndicatorStyle: {
              backgroundColor: themeColors.text,  // White line under active tab
              height: 3,                // Thickness of the indicator
              top: 0
            },
            tabBarActiveTintColor: themeColors.text,   // Active tab text color
            tabBarInactiveTintColor: themeColors.tabBarInactiveColor, // Inactive tab text color
            tabBarLabelStyle: {
              textTransform: 'none',    // Remove uppercase styling
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen 
            name="Details" 
            component={EventDetails} 
            options={{ title: 'What' }}
          />
          <Tab.Screen 
            name="Date & Location" 
            component={EventDateAndLocation} 
            options={{ title: 'When & Where' }}
          />
          <Tab.Screen 
            name="Attendees & Options" 
            component={EventAttendeesAndOptions} 
            options={{ title: 'Who' }}
          />
        </Tab.Navigator>
      </ThemedView>
    </CreateEventScrollContext.Provider>
  );
}

// Main component that provides the context
export default function CreateEventTabs() {
  return (
    <CreateEventProvider>
      <TabsNavigator />
    </CreateEventProvider>
  );
}