import React, { useEffect, useCallback } from 'react';
import { Dimensions, Alert } from 'react-native';
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
import { CreateEventScrollContext } from '@/context/CreateEventScrollContext';

const Tab = createMaterialTopTabNavigator();

// Inner component that has access to the context
function TabsNavigator() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { isEditMode, title, category, description, location, capacity, recurrence, attendees, visibility, resetEventForm } = useCreateEventContext();
  const navigation = useNavigation();
  const router = useRouter();

  // Shared scroll state for all tabs
  const bounceCompleted = useSharedValue(false);
  const wasDraggingAtTop = useSharedValue(false);
  const isDismissing = useSharedValue(false);

  const hasUnsavedChanges = useCallback(() => {
    if (isEditMode) {
      // For edit mode, we conservatively assume there are unsaved changes if any setter changed the value. 
      // Since fine-grained tracking isn't implemented yet, we simply compare against the "dirty" indicators below.
    }
    return (
      title.trim() !== '' ||
      category !== null ||
      (description ?? '').trim() !== '' ||
      location.text !== null ||
      capacity !== null ||
      recurrence.checked ||
      recurrence.frequency !== null ||
      recurrence.end_date !== null ||
      attendees.length > 0 ||
      visibility !== 'private'
    );
  }, [title, category, description, location.text, capacity, recurrence, attendees.length, visibility, isEditMode]);

  // Handle dismissal at the parent level
  const handleDismiss = useCallback(() => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Continue Editing', style: 'cancel', onPress: () => {
              // Reset dismissal flags so the scroll handler can detect next swipe
              isDismissing.value = false;
              bounceCompleted.value = false;
              wasDraggingAtTop.value = false;
            } },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetEventForm();
              if (router.canGoBack()) {
                router.dismissAll();
              }
            },
          },
        ],
      );
    } else {
      if (router.canGoBack()) {
        router.dismissAll();
      }
    }
  }, [hasUnsavedChanges, resetEventForm, router]);

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
            lazy: false, // Enable lazy loading - tabs only mount when first visited
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