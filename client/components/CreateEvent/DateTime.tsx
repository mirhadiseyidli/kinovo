import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedRef,
  cancelAnimation
} from 'react-native-reanimated';
import { DateTimePicker } from '@expo/ui/swift-ui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useCreateEventContext } from '@/context/CreateEventContext';

const DateTime = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { startTime, endTime, settingEventStartTime, settingEventEndTime } = useCreateEventContext();

  // Helper function to get default start time (30 mins from now)
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now;
  };

  // Helper function to get default end time (1 hour from start time)
  const getDefaultEndTime = (startTime: Date) => {
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  };

  // Helper function to validate date (ensure it's not invalid like 1969)
  const isValidDate = (date: Date | null | undefined): boolean => {
    if (!date) return false;
    const year = date.getFullYear();
    return year >= 2020 && year <= 2100; // Reasonable range
  };

  const getInitialStartDate = () => {
    if (startTime && isValidDate(startTime)) {
      return startTime;
    }
    return getDefaultStartTime();
  };

  const getInitialEndDate = () => {
    if (endTime && isValidDate(endTime)) {
      return endTime;
    }
    return getDefaultEndTime(getInitialStartDate());
  };

  const [startDate, setStartDate] = useState<Date>(getInitialStartDate());
  const [endDate, setEndDate] = useState<Date>(getInitialEndDate());
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
  
  // Reanimated shared values
  const showStartPickerProgress = useSharedValue(0);
  const showEndPickerProgress = useSharedValue(0);
  
  // Refs for measuring component heights
  const startPickerRef = useAnimatedRef();
  const endPickerRef = useAnimatedRef();

  // Update local state when context changes
  useEffect(() => {
    if (startTime && isValidDate(startTime)) {
      const newStartDate = new Date(startTime);
      setStartDate(newStartDate);
      // Update end date to maintain 1 hour duration if no specific end time set
      if (!endTime) {
        const newEndDate = getDefaultEndTime(newStartDate);
        setEndDate(newEndDate);
      }
    }
  }, [startTime]);

  useEffect(() => {
    if (endTime && isValidDate(endTime)) {
      setEndDate(new Date(endTime));
    }
  }, [endTime]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(showStartPickerProgress);
      cancelAnimation(showEndPickerProgress);
    };
  }, []);

  const handleStartDateChange = (selectedDate: Date) => {
    // Calculate new end time (1 hour after start time)
    const newEndTime = new Date(selectedDate);
    newEndTime.setHours(newEndTime.getHours() + 1);
    
    // Update both start and end times
    setStartDate(selectedDate);
    setEndDate(newEndTime);
    
    // Update context with both times
    settingEventStartTime(selectedDate);
    settingEventEndTime(newEndTime);
  };

  const handleEndDateChange = (selectedDate: Date) => {
    // Ensure end date is on the same day as start date
    const finalEndDate = new Date(startDate);
    finalEndDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    
    // Ensure it's at least 10 minutes after start
    const minEndTime = new Date(startDate);
    minEndTime.setMinutes(minEndTime.getMinutes() + 10);
    
    const dateToUse = finalEndDate >= minEndTime ? finalEndDate : minEndTime;
    setEndDate(dateToUse);
    settingEventEndTime(dateToUse);
  };

  // Animated styles using Reanimated
  const startPickerStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(showStartPickerProgress.value === 1 ? 360 : 0, { duration: 300 }),
      opacity: withTiming(showStartPickerProgress.value, { duration: 200 })
    };
  });

  const endPickerStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(showEndPickerProgress.value === 1 ? 220 : 0, { duration: 300 }),
      opacity: withTiming(showEndPickerProgress.value, { duration: 200 })
    };
  });

  const toggleStartPicker = () => {
    const isOpening = !showStartPicker;
    setShowStartPicker(isOpening);
    
    if (isOpening && showEndPicker) {
      // Close end picker first
      setShowEndPicker(false);
      showEndPickerProgress.value = withTiming(0, { duration: 200 });
    }
    
    // Animate with Reanimated
    showStartPickerProgress.value = withTiming(isOpening ? 1 : 0, { duration: 300 });
  };

  const toggleEndPicker = () => {
    const isOpening = !showEndPicker;
    setShowEndPicker(isOpening);
    
    if (isOpening && showStartPicker) {
      // Close start picker first
      setShowStartPicker(false);
      showStartPickerProgress.value = withTiming(0, { duration: 200 });
    }
    
    // Animate with Reanimated
    showEndPickerProgress.value = withTiming(isOpening ? 1 : 0, { duration: 300 });
  };

  return (
    <ThemedView
      style={{
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        width: '100%',
        borderRadius: 8,
        backgroundColor: themeColors.inputBackgroundColor,
        marginTop: 8
      }}
    >
      {/* Start Date & Time */}
      <TouchableOpacity onPress={toggleStartPicker}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="circle" size={14} color={themeColors.placeholderTextColor} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '500', color: themeColors.placeholderTextColor }}>
              Start
            </Text>
          </View>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
          }}>
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'right', color: themeColors.text, marginRight: 8 }}>
              {`${startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </ThemedText>
            <Feather 
              name={showStartPicker ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={themeColors.text} 
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Start Date Picker - Expandable */}
      <Animated.View 
        ref={startPickerRef}
        style={[{ overflow: 'hidden' }, startPickerStyle]}
      >
        <View style={{ paddingBottom: 10 }}>
          <DateTimePicker
            initialDate={startDate.toISOString()}
            color={themeColors.mountainGreen}
            displayedComponents="dateAndTime"
            variant="graphical"
            onDateSelected={handleStartDateChange}
            style={{ height: 280, width: '100%' }}
          />
        </View>
      </Animated.View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: themeColors.placeholderTextColor, opacity: 0.2, marginLeft: 22, marginVertical: 16 }} />

      {/* End Time */}
      <TouchableOpacity onPress={toggleEndPicker}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="circle" size={14} color={themeColors.placeholderTextColor} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '500', color: themeColors.placeholderTextColor }}>
              End
            </Text>
          </View>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
          }}>
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'right', color: themeColors.text, marginRight: 8 }}>
              {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </ThemedText>
            <Feather 
              name={showEndPicker ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={themeColors.text} 
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* End Time Picker - Expandable */}
      <Animated.View 
        ref={endPickerRef}
        style={[{ overflow: 'hidden' }, endPickerStyle]}
      >
        <View style={{ paddingBottom: 10 }}>
          <DateTimePicker
            key={endDate.toISOString()}
            initialDate={endDate.toISOString()}
            color={themeColors.mountainGreen}
            displayedComponents="hourAndMinute"
            variant="wheel"
            onDateSelected={handleEndDateChange}
            style={{ height: 200, width: '100%' }}
          />
        </View>
      </Animated.View>
    </ThemedView>
  );
};

export default DateTime;