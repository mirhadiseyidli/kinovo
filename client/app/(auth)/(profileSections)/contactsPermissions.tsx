import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ScrollView, Switch, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

const ContactsPermissions = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    setIsEnabled(status === 'granted');
  };

  const togglePermission = async () => {
    if (isEnabled) {
      // Can't revoke programmatically, direct user to settings
      await Contacts.getPermissionsAsync();
    } else {
      const { status } = await Contacts.requestPermissionsAsync();
      setIsEnabled(status === 'granted');
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
          headerTitle: 'Contacts Permissions',
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
          <ThemedText style={{ fontSize: 16 }}>Allow Contacts Access</ThemedText>
          <Switch
            trackColor={{ false: themeColors.border, true: themeColors.mountainGreen }}
            thumbColor={isEnabled ? themeColors.text : themeColors.placeholderTextColor}
            onValueChange={togglePermission}
            value={isEnabled}
          />
        </View>
        <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>
          Enable contacts access to find and connect with your friends on Kinovo. You can change this setting at any time in your device settings.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
};

export default ContactsPermissions; 