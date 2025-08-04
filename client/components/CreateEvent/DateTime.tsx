import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useCreateEventContext } from '@/context/CreateEventContext';
import DateTimePickerModal from './DateTimePickerModal';

interface DateTimeProps {
  ref?: React.Ref<{
    closeStartPicker: () => void;
    closeEndPicker: () => void;
    openStartPicker: () => void;
    openEndPicker: () => void;
  }>;
  onPickerOpen?: (pickerType: 'startTime' | 'endTime' | 'repeat' | 'endOn') => void;
}

const DateTime = ({ ref, onPickerOpen }: DateTimeProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { startTime, endTime, settingEventStartTime, settingEventEndTime } = useCreateEventContext();

  // Helper function to get default start time (30 mins from now) - memoized
  const getDefaultStartTime = useCallback(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now;
  }, []);

  // Helper function to get default end time (1 hour from start time) - memoized
  const getDefaultEndTime = useCallback((startTime: Date) => {
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  }, []);

  // Helper function to validate date (ensure it's not invalid like 1969) - memoized
  const isValidDate = useCallback((date: Date | null | undefined): boolean => {
    if (!date) return false;
    const year = date.getFullYear();
    return year >= 2020 && year <= 2100; // Reasonable range
  }, []);

  const getInitialStartDate = useMemo(() => {
    if (startTime && isValidDate(startTime)) {
      return startTime;
    }
    return getDefaultStartTime();
  }, [startTime, isValidDate, getDefaultStartTime]);

  const getInitialEndDate = useMemo(() => {
    if (endTime && isValidDate(endTime)) {
      return endTime;
    }
    return getDefaultEndTime(getInitialStartDate);
  }, [endTime, isValidDate, getDefaultEndTime, getInitialStartDate]);

  const [startDate, setStartDate] = useState<Date>(getInitialStartDate);
  const [endDate, setEndDate] = useState<Date>(getInitialEndDate);
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
  
  // Shared values for chevron rotation
  const startChevronRotation = useSharedValue(0);
  const endChevronRotation = useSharedValue(0);

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


  const handleStartDateChange = useCallback((selectedDate: Date) => {
    // Calculate new end time (1 hour after start time)
    const newEndTime = new Date(selectedDate);
    newEndTime.setHours(newEndTime.getHours() + 1);
    
    // Update both start and end times
    setStartDate(selectedDate);
    setEndDate(newEndTime);
    
    // Update context with both times
    settingEventStartTime(selectedDate);
    settingEventEndTime(newEndTime);
  }, [settingEventStartTime, settingEventEndTime]);

  const handleEndDateChange = useCallback((selectedDate: Date) => {
    // Ensure end date is on the same day as start date
    const finalEndDate = new Date(startDate);
    finalEndDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    
    // Ensure it's at least 10 minutes after start
    const minEndTime = new Date(startDate);
    minEndTime.setMinutes(minEndTime.getMinutes() + 10);
    
    const dateToUse = finalEndDate >= minEndTime ? finalEndDate : minEndTime;
    setEndDate(dateToUse);
    settingEventEndTime(dateToUse);
  }, [startDate, settingEventEndTime]);

  // Animated styles for chevron rotation
  const startChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${startChevronRotation.value}deg` }]
    };
  });
  
  const endChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${endChevronRotation.value}deg` }]
    };
  });

  const toggleStartPicker = useCallback(() => {
    const isOpening = !showStartPicker;
    
    if (isOpening && onPickerOpen) {
      onPickerOpen('startTime');
    }
    
    setShowStartPicker(isOpening);
    
    // Animate chevron rotation
    startChevronRotation.value = withTiming(isOpening ? 180 : 0, { duration: 250 });
  }, [showStartPicker, onPickerOpen]);

  const toggleEndPicker = useCallback(() => {
    const isOpening = !showEndPicker;
    
    if (isOpening && onPickerOpen) {
      onPickerOpen('endTime');
    }
    
    setShowEndPicker(isOpening);
    
    // Animate chevron rotation
    endChevronRotation.value = withTiming(isOpening ? 180 : 0, { duration: 250 });
  }, [showEndPicker, onPickerOpen]);
  
  // Expose individual picker control methods
  const closeStartPicker = useCallback(() => {
    setShowStartPicker(false);
    startChevronRotation.value = withTiming(0, { duration: 250 });
  }, []);
  
  const closeEndPicker = useCallback(() => {
    setShowEndPicker(false);
    endChevronRotation.value = withTiming(0, { duration: 250 });
  }, []);
  
  const openStartPicker = useCallback(() => {
    setShowStartPicker(true);
    startChevronRotation.value = withTiming(180, { duration: 250 });
  }, []);
  
  const openEndPicker = useCallback(() => {
    setShowEndPicker(true);
    endChevronRotation.value = withTiming(180, { duration: 250 });
  }, []);
  
  useImperativeHandle(ref, () => ({
    closeStartPicker,
    closeEndPicker,
    openStartPicker,
    openEndPicker
  }), [closeStartPicker, closeEndPicker, openStartPicker, openEndPicker]);

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
          </View>
        </View>
      </TouchableOpacity>

      {/* Start Date Picker Modal */}
      <DateTimePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        initialDate={startDate.toISOString()}
        onDateSelected={handleStartDateChange}
        themeColors={themeColors}
        displayedComponents="dateAndTime"
        variant="graphical"
      />

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
          </View>
        </View>
      </TouchableOpacity>

      {/* End Time Picker Modal */}
      <DateTimePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        initialDate={endDate.toISOString()}
        onDateSelected={handleEndDateChange}
        themeColors={themeColors}
        displayedComponents="hourAndMinute"
        variant="wheel"
      />
    </ThemedView>
  );
};

export default DateTime;