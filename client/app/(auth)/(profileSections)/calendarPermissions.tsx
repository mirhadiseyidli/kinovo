import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ScrollView, Switch, View, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { SyncStatusIndicator } from '@/components/Calendar/SyncStatusIndicator';
import * as Linking from 'expo-linking';
import * as Calendar from 'expo-calendar';

const CalendarPermissions = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const {
    syncEnabled,
    enableSync,
    disableSync,
    syncing,
    lastSyncError,
    syncAllExistingEvents,
  } = useCalendarSync();

  const [loading, setLoading] = useState(false);
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);

  // Load calendar permission status on mount
  useEffect(() => {
    loadCalendarPermission();
  }, []);

  const loadCalendarPermission = async () => {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      setHasCalendarPermission(status === 'granted');
    } catch (error) {
      console.error('Failed to check calendar permission:', error);
    }
  };

  const handleTogglePermission = async (value: boolean) => {
    setPermissionLoading(true);
    
    if (value) {
      try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        setHasCalendarPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Calendar permission is required to sync events. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      } catch (error) {
        console.error('Failed to request calendar permission:', error);
        Alert.alert('Error', 'Failed to request calendar permission.');
      }
    } else {
      // Can't revoke permission programmatically
      Alert.alert(
        'Disable Permission',
        'To disable calendar permission, please go to Settings > Privacy & Security > Calendars and turn off access for Kinovo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
    
    setPermissionLoading(false);
  };

  const handleToggleSync = async (value: boolean) => {
    setLoading(true);
    
    if (value) {
      const success = await enableSync();
      if (!success) {
        // Permission denied or setup failed
        Alert.alert(
          'Setup Failed',
          'Unable to enable calendar sync. Please check your permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } else {
      await disableSync();
    }
    
    setLoading(false);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Calendar Permission Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 16 }}>Calendar Permission</ThemedText>
          <Switch
            trackColor={{ false: themeColors.border, true: themeColors.mountainGreen }}
            thumbColor={hasCalendarPermission ? themeColors.text : themeColors.placeholderTextColor}
            onValueChange={handleTogglePermission}
            value={hasCalendarPermission}
            disabled={permissionLoading}
          />
        </View>
        
        <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 20 }}>
          Allow Kinovo to access your iOS Calendar to sync events.
        </ThemedText>

        {/* Calendar Sync Toggle - Only show if permission granted */}
        {hasCalendarPermission && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <ThemedText style={{ fontSize: 16 }}>Calendar Sync</ThemedText>
              <Switch
                trackColor={{ false: themeColors.border, true: themeColors.mountainGreen }}
                thumbColor={syncEnabled ? themeColors.text : themeColors.placeholderTextColor}
                onValueChange={handleToggleSync}
                value={syncEnabled}
                disabled={loading}
              />
            </View>
            
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 20 }}>
              Automatically sync your Kinovo events to your iOS calendar. You can change this setting at any time.
            </ThemedText>
          </>
        )}

        {/* Status Indicator - Simple Addition */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <SyncStatusIndicator
            syncing={syncing}
            synced={syncEnabled && !lastSyncError}
            error={lastSyncError}
            compact={false}
          />
        </View>

        {syncEnabled && (
          <>
            {/* Error Display - Simple Style */}
            {lastSyncError && (
              <View style={{ 
                backgroundColor: '#FFEBEE', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16 
              }}>
                <ThemedText style={{ color: '#C62828', fontSize: 14 }}>
                  Sync Error: {lastSyncError}
                </ThemedText>
              </View>
            )}

            {/* Sync Existing Events Button */}
            <TouchableOpacity
              onPress={syncAllExistingEvents}
              disabled={syncing}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: themeColors.mountainGreen,
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                opacity: syncing ? 0.6 : 1,
              }}
            >
              <Feather 
                name="refresh-cw" 
                size={16} 
                color={themeColors.text} 
                style={{ marginRight: 8 }} 
              />
              <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                Sync Existing Events
              </ThemedText>
              {syncing && (
                <ActivityIndicator size="small" color={themeColors.text} />
              )}
            </TouchableOpacity>
            
            <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor, marginBottom: 16 }}>
              Sync events that were created before enabling calendar sync
            </ThemedText>

            {/* How it works - Simple Text */}
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginTop: 8 }}>
              How calendar sync works:
            </ThemedText>
            <ThemedText style={{ fontSize: 13, color: themeColors.placeholderTextColor, marginTop: 4, lineHeight: 18 }}>
              • Events are automatically synced when created or updated{'\n'}
              • You can toggle sync per event when creating{'\n'}  
              • Deleted events are removed from your calendar{'\n'}
              • Changes made in iOS Calendar won't affect Kinovo events
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default CalendarPermissions; 