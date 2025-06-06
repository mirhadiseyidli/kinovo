import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Alert, Dimensions, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import api from '@/utils/api';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';

const ACTIVITIES = [
  'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Canoeing', 'Crossfit',
  'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
  'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate',
  'Inline Skate', 'Kayaking', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
  'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing',
  'Roller Ski', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard',
  'Snowshoe', 'Soccer', 'Squash', 'Stair Stepper', 'Stand Up Paddling',
  'Surfing', 'Swim', 'Table Tennis', 'Tennis', 'Trail Run', 'Velomobile',
  'Walk', 'Weight Training', 'Wheelchair', 'Windsurf', 'Workout', 'Yoga'
];

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTagModal({ visible, onClose, onSuccess }: CreateTagModalProps) {
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleCreateTag = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/users/tags', { activity_name: selectedActivity });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View 
          entering={FadeIn.duration(200)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
          />
        </Animated.View>
        <ThemedView
          style={{
            width: '90%',
            backgroundColor: themeColors.background,
            borderRadius: 16,
            padding: 16,
            gap: 16,
          }}
        >
          <ThemedText style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
            Select Activity Tag
          </ThemedText>
          
          <View style={{ 
            backgroundColor: themeColors.background,
            borderRadius: 8,
            overflow: 'hidden'
          }}>
            <Picker
              selectedValue={selectedActivity}
              onValueChange={(itemValue) => setSelectedActivity(itemValue)}
              style={{
                color: themeColors.text,
                backgroundColor: 'transparent',
              }}
              dropdownIconColor={themeColors.text}
            >
              {ACTIVITIES.map((activity) => (
                <Picker.Item 
                  key={activity} 
                  label={activity} 
                  value={activity}
                  color={themeColors.text}
                />
              ))}
            </Picker>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: themeColors.inputBackgroundColor,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateTag}
              disabled={isLoading}
              style={{
                flex: 1,
                backgroundColor: themeColors.mountainGreen,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '600', color: themeColors.text }}>
                {isLoading ? 'Creating...' : 'Create'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
} 