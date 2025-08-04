import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useCreateEventContext } from '@/context/CreateEventContext';
import AnimatedCheckBox from '../AnimatedCheckBox';
import PickerModal from './PickerModal';

const Options: React.FC<{ setLimit: (value: number | null) => void }> = ({ setLimit }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { visibility: contextVisibility, capacity: contextCapacity, settingEventVisibility, settingEventCapacity } = useCreateEventContext();
  
  const [visibility, setVisibility] = useState(contextVisibility || 'private');
  const [capacity, setCapacity] = useState<number | null>(contextCapacity);
  const [isLimited, setIsLimited] = useState(contextCapacity !== null);
  const [capacityInput, setCapacityInput] = useState(contextCapacity !== null ? contextCapacity.toString() : '');
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  
  // Visibility options
  const visibilityOptions = ['Friends', 'Private', 'Public'];

  // Update local state when context changes (e.g., when loading existing event)
  useEffect(() => {
    if (contextVisibility) {
      setVisibility(contextVisibility);
    }
    
    if (contextCapacity !== undefined) {
      setCapacity(contextCapacity);
      setIsLimited(contextCapacity !== null);
      setCapacityInput(contextCapacity !== null ? contextCapacity.toString() : '');
      
      // Update parent component's limit
      setLimit(contextCapacity);
    }
  }, [contextVisibility, contextCapacity, setLimit]);

  const toggleCheck = (newValue: boolean) => {
    setIsLimited(newValue);

    if (!newValue) {
      setCapacity(null);
      setCapacityInput('');
      settingEventCapacity(null);
      setLimit(null);
    } else if (capacity !== null && capacity > 0) {
      settingEventCapacity(capacity);
      setLimit(capacity);
    }

    // CSS animations handle the expansion automatically
  };

  const toggleVisibilityPicker = () => {
    setShowVisibilityPicker(!showVisibilityPicker);
  };

  const handleVisibilitySelection = (selected: string) => {
    let visibilityValue: string;
    
    switch (selected) {
      case 'Friends':
        visibilityValue = 'private';
        break;
      case 'Private':
        visibilityValue = 'selected';
        break;
      case 'Public':
        visibilityValue = 'public';
        break;
      default:
        visibilityValue = 'private';
    }
    
    setVisibility(visibilityValue);
    settingEventVisibility(visibilityValue);
  };

  const onCapacityChange = (text: string) => {
    setCapacityInput(text);
    const numeric = text.replace(/[^0-9]/g, '');
    const num = numeric === '' ? 0 : parseInt(numeric, 10);
    setCapacity(num);
    if (isLimited) {
      settingEventCapacity(num);
      setLimit(num);
    }
  };

  const interpretVisibility = (val: string) => {
    if (val === 'public') return 'Public';
    if (val === 'selected') return 'Private';
    if (val === 'private') return 'Friends';
    return 'Friends';
  };

  return (
      <ThemedView
        style={{
          alignSelf: 'center',
          paddingVertical: 8,
          paddingHorizontal: 20,
          width: '100%',
          borderRadius: 8,
          marginTop: 8,
          backgroundColor: themeColors.inputBackgroundColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name="eye"
              size={16}
              color={themeColors.placeholderTextColor}
              style={{ marginRight: 8 }}
            />
            <ThemedText
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: themeColors.placeholderTextColor,
                marginRight: 12,
              }}
            >
              Visibility
            </ThemedText>
          </View>
          <TouchableOpacity 
            onPress={toggleVisibilityPicker}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text, marginRight: 8 }}>
              {interpretVisibility(visibility)}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Visibility Picker Modal */}
        <PickerModal
          visible={showVisibilityPicker}
          onClose={() => setShowVisibilityPicker(false)}
          selectedValue={interpretVisibility(visibility)}
          onValueChange={handleVisibilitySelection}
          themeColors={themeColors}
          options={visibilityOptions}
        />

        <View
          style={{
            height: 1,
            backgroundColor: themeColors.placeholderTextColor,
            opacity: 0.2,
            marginVertical: 16,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8 }}>
          <AnimatedCheckBox
            value={isLimited}
            onValueChange={toggleCheck}
            onCheckColor={themeColors.text} // checkmark color
            tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor  }} // border color states
            style={{ flexDirection: 'row', alignItems: 'center' }}
            checkBoxStyle={{ height: 18, width: 18, marginRight: 8 }}
            label='Limited Capacity'
            textStyle={{ fontSize: 16, color: themeColors.text }}
          />
        </View>

        {/* Expanding Capacity Section - Same as Frequency */}
        <Animated.View style={{
          maxHeight: isLimited ? 80 : 0,
          opacity: isLimited ? 1 : 0,
          transitionProperty: ['maxHeight', 'opacity'],
          transitionDuration: '350ms',
          transitionTimingFunction: 'ease-in-out',
          overflow: 'hidden',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="users"
                size={16}
                color={themeColors.placeholderTextColor}
                style={{ marginRight: 8 }}
              />
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: themeColors.placeholderTextColor,
                  marginRight: 12,
                }}
              >
                Capacity
              </ThemedText>
            </View>
            <TextInput 
              value={capacityInput}
              onChangeText={onCapacityChange}
              placeholder='Number of Attendees'
              placeholderTextColor={themeColors.placeholderTextColor}
              keyboardType='numeric'
              style={{
                backgroundColor: Colors[colorScheme ?? 'dark'].background,
                width: 'auto',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                color: themeColors.text,
                fontSize: 12,
                fontWeight: 'bold',
                textAlign: 'right'
              }}
            />
          </View>
        </Animated.View>
      </ThemedView>
  );
};

export default Options;