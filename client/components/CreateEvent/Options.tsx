import React, { useState } from 'react';
import { View, TouchableOpacity, Dimensions, ActionSheetIOS, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const Options: React.FC = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // ✅ State for Visibility & Capacity
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Public');
  const [capacity, setCapacity] = useState('Unlimited');

  // ✅ Function to Open Native Action Sheet for Visibility
  const openVisibilityOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Public', 'Private', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) setVisibility('Public');
          else if (buttonIndex === 1) setVisibility('Private');
        }
      );
    } else {
      Alert.alert('Select Visibility', '', [
        { text: 'Public', onPress: () => setVisibility('Public') },
        { text: 'Private', onPress: () => setVisibility('Private') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ✅ Function to Open Native Action Sheet for Capacity
  const openCapacityOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Unlimited', '50 People', '100 People', 'Cancel'],
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) setCapacity('Unlimited');
          else if (buttonIndex === 1) setCapacity('50 People');
          else if (buttonIndex === 2) setCapacity('100 People');
        }
      );
    } else {
      Alert.alert('Select Capacity', '', [
        { text: 'Unlimited', onPress: () => setCapacity('Unlimited') },
        { text: '50 People', onPress: () => setCapacity('50 People') },
        { text: '100 People', onPress: () => setCapacity('100 People') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <ThemedView
        style={{
          alignSelf: 'center',
          paddingVertical: 16,
          paddingHorizontal: 20,
          width: '100%',
          borderRadius: 8,
          backgroundColor: themeColors.inputBackgroundColor,
          elevation: 5,
        }}
      >
        {/* Visibility Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Feather
            name="eye"
            size={16}
            color={themeColors.placeholderTextColor}
            style={{ marginRight: 8 }}
          />
          <ThemedText
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: themeColors.placeholderTextColor,
              marginRight: 12,
            }}
          >
            Visibility
          </ThemedText>
          <TouchableOpacity style={{ flex: 1, alignItems: 'flex-end' }} onPress={openVisibilityOptions}>
            <ThemedText style={{ fontSize: 16, fontWeight: '400', color: '#007AFF' }}>
              {visibility}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: themeColors.placeholderTextColor,
            opacity: 0.2,
            marginBottom: 16,
          }}
        />

        {/* Capacity Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather
            name="users"
            size={16}
            color={themeColors.placeholderTextColor}
            style={{ marginRight: 8 }}
          />
          <ThemedText
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: themeColors.placeholderTextColor,
              marginRight: 12,
            }}
          >
            Capacity
          </ThemedText>
          <TouchableOpacity style={{ flex: 1, alignItems: 'flex-end' }} onPress={openCapacityOptions}>
            <ThemedText style={{ fontSize: 16, fontWeight: '400', color: '#007AFF' }}>
              {capacity}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default Options;