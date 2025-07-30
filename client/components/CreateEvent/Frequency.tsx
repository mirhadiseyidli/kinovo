import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  useAnimatedRef,
  cancelAnimation
} from 'react-native-reanimated';
import { DateTimePicker, Picker } from '@expo/ui/swift-ui';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCreateEventContext } from '@/context/CreateEventContext';
import AnimatedCheckBox from '../AnimatedCheckBox';
import { Feather } from '@expo/vector-icons';

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const Frequency: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { recurrence, settingEventRecurrence, startTime } = useCreateEventContext();
  
  const [isRecurring, setIsRecurring] = useState(recurrence?.checked || false);
  const [unit, setUnit] = useState<string>(recurrence?.frequency ? capitalizeFirstLetter(recurrence.frequency) : 'Select');
  
  // Helper function to get default recurrence end date (1 month from start time)
  const getDefaultRecurrenceEndDate = (startTimeParam?: Date | null) => {
    const defaultDate = new Date(startTimeParam || new Date());
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    return defaultDate;
  };
  
  const [endDate, setEndDate] = useState<Date | null>(recurrence?.end_date ? new Date(recurrence.end_date) : getDefaultRecurrenceEndDate(startTime));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  
  // Reanimated shared values
  const isRecurringProgress = useSharedValue(recurrence?.checked ? 1 : 0);
  const showUnitPickerProgress = useSharedValue(0);
  const showDatePickerProgress = useSharedValue(0);
  
  // Refs for measuring component heights
  const unitPickerRef = useAnimatedRef();
  const datePickerRef = useAnimatedRef();

  // Picker options
  const frequencyOptions = ['Select', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
  const getSelectedIndex = () => {
    if (unit === 'Select') return 0;
    return frequencyOptions.indexOf(unit);
  };

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
      
      // Animate to expanded state if recurrence is checked
      isRecurringProgress.value = withTiming(recurrence.checked ? 1 : 0, { duration: 300 });
    }
  }, [recurrence]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(isRecurringProgress);
      cancelAnimation(showUnitPickerProgress);
      cancelAnimation(showDatePickerProgress);
    };
  }, []);

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

  const toggleCheck = (newValue: boolean) => {
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
        showDatePickerProgress.value = withTiming(0, { duration: 300 });
      }
      if (showUnitPicker) {
        setShowUnitPicker(false);
        showUnitPickerProgress.value = withTiming(0, { duration: 300 });
      }
    } else if (unit !== 'Select' && endDate) {
      settingEventRecurrence({
        checked: true,
        frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: endDate
      });
    }
    
    // Animate with Reanimated
    isRecurringProgress.value = withTiming(newValue ? 1 : 0, { duration: 300 });
  };

  // Animated styles using Reanimated
  const recurringTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      isRecurringProgress.value,
      [0, 1],
      [themeColors.placeholderTextColor, themeColors.text]
    );
    return { color };
  });

  const recurringContainerStyle = useAnimatedStyle(() => {
    const baseHeight = isRecurringProgress.value * 84;
    const unitPickerHeight = showUnitPickerProgress.value * 150;
    const totalHeight = baseHeight + unitPickerHeight;
    
    return {
      height: withTiming(totalHeight, { duration: 300 }),
      opacity: withTiming(isRecurringProgress.value, { duration: 300 })
    };
  });

  const unitPickerStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(showUnitPickerProgress.value === 1 ? 150 : 0, { duration: 300 }),
      opacity: withTiming(showUnitPickerProgress.value, { duration: 200 })
    };
  });

  const datePickerStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(showDatePickerProgress.value === 1 ? 334 : 0, { duration: 300 }),
      opacity: withTiming(showDatePickerProgress.value, { duration: 200 })
    };
  });

  const handleUnitSelection = (event: { nativeEvent: { index: number; label: string } }) => {
    const selected = event.nativeEvent.label;
    setUnit(selected);
    
    if (selected === 'Select') {
      // Clear the recurrence when "Select" is chosen
      settingEventRecurrence({
        checked: true,
        frequency: null,
        end_date: null
      });
    } else if (endDate) {
      settingEventRecurrence({
        checked: true,
        frequency: selected.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: endDate
      });
    }
  };

  const toggleUnitPicker = () => {
    const isOpening = !showUnitPicker;
    setShowUnitPicker(isOpening);
    
    // Close date picker if it's open
    if (isOpening && showDatePicker) {
      setShowDatePicker(false);
      showDatePickerProgress.value = withTiming(0, { duration: 300 });
    }
    
    // Animate with Reanimated
    showUnitPickerProgress.value = withTiming(isOpening ? 1 : 0, { duration: 300 });
  };

  const handleDateChange = (selectedDate: Date) => {
    setEndDate(selectedDate);
    if (isRecurring && unit !== 'Select') {
      settingEventRecurrence({
        checked: true,
        frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: selectedDate
      });
    }
  };

  const toggleDatePicker = () => {
    const isOpening = !showDatePicker;
    setShowDatePicker(isOpening);
    
    // Close unit picker if it's open
    if (isOpening && showUnitPicker) {
      setShowUnitPicker(false);
      showUnitPickerProgress.value = withTiming(0, { duration: 300 });
    }
    
    // Animate with Reanimated
    showDatePickerProgress.value = withTiming(isOpening ? 1 : 0, { duration: 300 });
  };


  return (
    <ThemedView style={{ paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, backgroundColor: themeColors.inputBackgroundColor }}>
      {/* Selection: Only Once / Recurring */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AnimatedCheckBox
          value={isRecurring}
          onValueChange={toggleCheck}
          onCheckColor={themeColors.text}
          tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor }}
          style={{ height: 18, width: 18 }}
          topContainerStyle={{ marginRight: 10 }}
        />
        {/* Animated Text Color */}
        <Animated.Text style={[{ fontSize: 16 }, recurringTextStyle]}>
          Recurring
        </Animated.Text>
      </View>

      {/* Expanding Frequency Section */}
      <Animated.View style={[{ overflow: 'hidden' }, recurringContainerStyle]}>
        {isRecurring && (
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
                <Feather 
                  name={showUnitPicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={themeColors.text} 
                />
              </TouchableOpacity>
            </View>

            {/* Unit Picker - Expandable */}
            <Animated.View 
              ref={unitPickerRef}
              style={[{ overflow: 'hidden' }, unitPickerStyle]}
            >
              <View>
                <Picker
                  options={frequencyOptions}
                  selectedIndex={getSelectedIndex()}
                  variant="wheel"
                  color={themeColors.mountainGreen}
                  onOptionSelected={handleUnitSelection}
                  style={{ height: 130, width: '100%' }}
                />
              </View>
            </Animated.View>

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
                <Feather 
                  name={showDatePicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={themeColors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Date Picker - Expandable */}
      {isRecurring && (
        <Animated.View 
          ref={datePickerRef}
          style={[{ overflow: 'hidden' }, datePickerStyle]}
        >
          <View>
            <DateTimePicker
              initialDate={(endDate || getDefaultRecurrenceEndDate(startTime || undefined)).toISOString()}
              color={themeColors.mountainGreen}
              displayedComponents="date"
              variant="graphical"
              onDateSelected={handleDateChange}
              style={{ height: 280, width: '100%' }}
            />
          </View>
        </Animated.View>
      )}
    </ThemedView>
  );
};

export default Frequency;