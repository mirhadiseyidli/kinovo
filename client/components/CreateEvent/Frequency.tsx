import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCreateEventContext } from '@/context/CreateEventContext';
import AnimatedCheckBox from '../AnimatedCheckBox';
import { Feather } from '@expo/vector-icons';
import DateTimePickerModal from './DateTimePickerModal';
import PickerModal from './PickerModal';

// Helper function to capitalize the first letter of a string - moved outside component for better performance
const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

interface FrequencyProps {
  ref?: React.Ref<{
    closeRepeatPicker: () => void;
    closeEndOnPicker: () => void;
    openRepeatPicker: () => void;
    openEndOnPicker: () => void;
  }>;
  onPickerOpen?: (pickerType: 'startTime' | 'endTime' | 'repeat' | 'endOn') => void;
}

const Frequency: React.FC<FrequencyProps> = ({ ref, onPickerOpen }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { recurrence, settingEventRecurrence, startTime } = useCreateEventContext();
  
  const [isRecurring, setIsRecurring] = useState(recurrence?.checked || false);
  const [unit, setUnit] = useState<string>(recurrence?.frequency ? capitalizeFirstLetter(recurrence.frequency) : 'Select');
  
  // Helper function to get default recurrence end date (1 month from start time) - memoized
  const getDefaultRecurrenceEndDate = useCallback((startTimeParam?: Date | null) => {
    const defaultDate = new Date(startTimeParam || new Date());
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    return defaultDate;
  }, []);
  
  const [endDate, setEndDate] = useState<Date | null>(recurrence?.end_date ? new Date(recurrence.end_date) : getDefaultRecurrenceEndDate(startTime));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  
  // Text color animation now handled by AnimatedCheckBox
  
  // Shared values for chevron rotation
  const unitChevronRotation = useSharedValue(0);
  const dateChevronRotation = useSharedValue(0);
  
  // Using CSS transitions for animations
  
  // Animated styles for chevron rotation
  const unitChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${unitChevronRotation.value}deg` }]
    };
  });
  
  const dateChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${dateChevronRotation.value}deg` }]
    };
  });
  

  // Picker options - memoized since they never change
  const frequencyOptions = useMemo(() => ['Select', 'Daily', 'Weekly', 'Monthly', 'Yearly'], []);
  
  // No longer needed with @react-native-picker/picker

  // Initialize with context values when component mounts or recurrence changes
  useEffect(() => {
    if (recurrence) {
      setIsRecurring(recurrence.checked);
      
      if (recurrence.frequency) {
        setUnit(capitalizeFirstLetter(recurrence.frequency));
      }
      
      if (recurrence.end_date) {
        const newEndDate = new Date(recurrence.end_date);
        setEndDate(newEndDate);
      }
      
      // Animation now handled by AnimatedCheckBox component
    }
  }, [recurrence]);


  // Update recurrence end date when start time changes
  useEffect(() => {
    if (startTime && isRecurring) {
      // Calculate new end date (1 month from new start time)
      const newEndDate = getDefaultRecurrenceEndDate(startTime);
      setEndDate(newEndDate);
      
      // Update context if recurrence is active
      if (unit !== 'Select') {
        settingEventRecurrence({
          checked: true,
          frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
          end_date: newEndDate
        });
      }
    }
  }, [startTime]);

  const toggleCheck = useCallback((newValue: boolean) => {
    setIsRecurring(newValue);
    
    if (!newValue) {
      settingEventRecurrence({
        checked: false,
        frequency: null,
        end_date: null
      });
      // Close pickers if open
      if (showDatePicker) {
        setShowDatePicker(false);
      }
      if (showUnitPicker) {
        setShowUnitPicker(false);
      }
    } else if (unit !== 'Select' && endDate) {
      settingEventRecurrence({
        checked: true,
        frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: endDate
      });
    }
    
    // Text color animation now handled by AnimatedCheckBox component
  }, [settingEventRecurrence, showDatePicker, showUnitPicker, unit, endDate]);

  // Text color is now handled by AnimatedCheckBox component

  const handleUnitSelection = useCallback((selectedValue: string) => {
    setUnit(selectedValue);
    
    if (selectedValue === 'Select') {
      // Clear the recurrence when "Select" is chosen
      settingEventRecurrence({
        checked: true,
        frequency: null,
        end_date: null
      });
    } else if (endDate) {
      settingEventRecurrence({
        checked: true,
        frequency: selectedValue.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: endDate
      });
    }
  }, [endDate, settingEventRecurrence]);

  const toggleUnitPicker = useCallback(() => {
    const isOpening = !showUnitPicker;
    
    if (isOpening && onPickerOpen) {
      onPickerOpen('repeat');
    }
    
    setShowUnitPicker(isOpening);
    
    // Animate chevron rotation
    unitChevronRotation.value = withTiming(isOpening ? 180 : 0, { duration: 250 });
  }, [showUnitPicker, onPickerOpen]);

  const handleDateChange = useCallback((selectedDate: Date) => {
    setEndDate(selectedDate);
    if (isRecurring && unit !== 'Select') {
      settingEventRecurrence({
        checked: true,
        frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: selectedDate
      });
    }
  }, [isRecurring, unit, settingEventRecurrence]);

  const toggleDatePicker = useCallback(() => {
    const isOpening = !showDatePicker;
    
    if (isOpening && onPickerOpen) {
      onPickerOpen('endOn');
    }
    
    setShowDatePicker(isOpening);
    
    // Animate chevron rotation
    dateChevronRotation.value = withTiming(isOpening ? 180 : 0, { duration: 250 });
  }, [showDatePicker, onPickerOpen]);

  // Expose individual picker control methods
  const closeRepeatPicker = useCallback(() => {
    setShowUnitPicker(false);
    unitChevronRotation.value = withTiming(0, { duration: 250 });
  }, []);
  
  const closeEndOnPicker = useCallback(() => {
    setShowDatePicker(false);
    dateChevronRotation.value = withTiming(0, { duration: 250 });
  }, []);
  
  const openRepeatPicker = useCallback(() => {
    setShowUnitPicker(true);
    unitChevronRotation.value = withTiming(180, { duration: 250 });
  }, []);
  
  const openEndOnPicker = useCallback(() => {
    setShowDatePicker(true);
    dateChevronRotation.value = withTiming(180, { duration: 250 });
  }, []);
  
  useImperativeHandle(ref, () => ({
    closeRepeatPicker,
    closeEndOnPicker,
    openRepeatPicker,
    openEndOnPicker
  }), [closeRepeatPicker, closeEndOnPicker, openRepeatPicker, openEndOnPicker]);

  return (
    <ThemedView style={{ paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, backgroundColor: themeColors.inputBackgroundColor }}>
      {/* Selection: Only Once / Recurring */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AnimatedCheckBox
          value={isRecurring}
          onValueChange={toggleCheck}
          onCheckColor={themeColors.text}
          tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          checkBoxStyle={{ height: 18, width: 18, marginRight: 8 }}
          label='Recurring'
          textStyle={{ fontSize: 16, color: themeColors.text }}
        />
      </View>

      {/* Expanding Frequency Section - Two-Layer CSS Animation */}
      <Animated.View style={{
        maxHeight: isRecurring ? 320 : 0,
        opacity: isRecurring ? 1 : 0,
        transitionProperty: ['maxHeight', 'opacity'],
        transitionDuration: '350ms',
        transitionTimingFunction: 'ease-in-out',
        overflow: 'hidden',
      }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>Repeat</Text>
            <TouchableOpacity 
              onPress={toggleUnitPicker}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>
                {unit}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Unit Picker Modal */}
          <PickerModal
            visible={showUnitPicker}
            onClose={() => setShowUnitPicker(false)}
            selectedValue={unit}
            onValueChange={handleUnitSelection}
            themeColors={themeColors}
            options={frequencyOptions}
          />

          {/* End Date Picker */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>End on</Text>
            <TouchableOpacity 
              onPress={toggleDatePicker}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>
                {endDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initialDate={(endDate || getDefaultRecurrenceEndDate(startTime || undefined)).toISOString()}
        onDateSelected={handleDateChange}
        themeColors={themeColors}
        displayedComponents="date"
        variant="graphical"
      />
    </ThemedView>
  );
};

export default Frequency;