import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ScrollView, Switch, View, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Linking from 'expo-linking';

const CalendarPermissions = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      setIsEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking calendar permission:', error);
    }
  };

  const togglePermission = async () => {
    if (isEnabled) {
      // Can't revoke programmatically, direct user to settings
      Alert.alert(
        "Change Permissions",
        "To change calendar permissions, you'll need to update them in your device settings. Would you like to open settings now?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Open Settings", 
            onPress: () => Linking.openSettings()
          }
        ]
      );
    } else {
      try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        setIsEnabled(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "To sync events with your calendar, you'll need to enable calendar access in your device settings. Would you like to open settings now?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Open Settings", 
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting calendar permission:', error);
        Alert.alert(
          "Error",
          "There was an error requesting calendar permissions. Please try again."
        );
      }
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Calendar Permissions',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 16 }}>Allow Calendar Access</ThemedText>
          <Switch
            trackColor={{ false: themeColors.border, true: themeColors.mountainGreen }}
            thumbColor={isEnabled ? themeColors.text : themeColors.placeholderTextColor}
            onValueChange={togglePermission}
            value={isEnabled}
          />
        </View>
        <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>
          Enable calendar access to sync your events with your device calendar. You can change this setting at any time in your device settings.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
};

export default CalendarPermissions; 