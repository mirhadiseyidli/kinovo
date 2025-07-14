import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, TouchableWithoutFeedback, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
// import { DateTimePicker } from '@expo/ui/swift-ui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import type { DateTimeState, DatePickerChangeHandler } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';

const DateTime = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { startTime, endTime, settingEventStartTime, settingEventEndTime } = useCreateEventContext();

  const [startDate, setStartDate] = useState<Date>(startTime || new Date());
  const [endDate, setEndDate] = useState<Date>(endTime || new Date());
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate);
  const mountedRef = React.useRef(true);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update local state when context changes
  useEffect(() => {
    if (startTime) {
      setStartDate(new Date(startTime));
      setTempStartDate(new Date(startTime));
    }
  }, [startTime]);

  useEffect(() => {
    if (endTime) {
      setEndDate(new Date(endTime));
      setTempEndDate(new Date(endTime));
    }
  }, [endTime]);

  const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };
  
  const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    if (mountedRef.current) {
      setStartDate(tempStartDate);
      settingEventStartTime(tempStartDate);
      setShowStartPicker(false);
    }
  };

  const confirmEndDate = () => {
    if (mountedRef.current) {
      setEndDate(tempEndDate);
      settingEventEndTime(tempEndDate);
      setShowEndPicker(false);
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="circle" size={14} color={themeColors.placeholderTextColor} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '500', color: themeColors.placeholderTextColor }}>
              Start
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowStartPicker(true)}
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'right', color: themeColors.text }}>
              {`${startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Start Date Picker Modal */}
        {showStartPicker && (
          <Modal transparent={true} animationType="fade" visible={showStartPicker}>
            <TouchableWithoutFeedback onPress={() => {
              if (mountedRef.current) {
                setShowStartPicker(false);
              }
            }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ backgroundColor: themeColors.background, padding: 20, borderRadius: 10, minHeight: 280 }}>
                  <View style={{ minWidth: 280, width: '100%', alignItems: 'center' }}>
                    <DateTimePicker
                      value={tempStartDate} // Use temp value
                      textColor={themeColors.text}
                      accentColor={themeColors.mountainGreen}
                      minimumDate={new Date()}
                      themeVariant={colorScheme === "light" ? "light" : "dark"}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleStartDateChange} // Store in temp
                      style={{ minHeight: 280, minWidth: 280, width: '100%' }} // Ensure minimum width
                    />
                  </View>
                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={confirmStartDate}
                    style={{
                      marginTop: 16,
                      marginBottom: 16,
                      backgroundColor: themeColors.mountainGreen,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: themeColors.placeholderTextColor, opacity: 0.2, marginBottom: 8, marginLeft: 22 }} />

        {/* End Date & Time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="circle" size={14} color={themeColors.placeholderTextColor} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '500', color: themeColors.placeholderTextColor }}>
              End
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowEndPicker(true)} 
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'right', color: themeColors.text }}>
              {`${endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* End Date Picker Modal */}
        {showEndPicker && (
          <Modal transparent={true} animationType="fade" visible={showEndPicker}>
            <TouchableWithoutFeedback onPress={() => {
              if (mountedRef.current) {
                setShowEndPicker(false);
              }
            }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ backgroundColor: themeColors.background, padding: 20, borderRadius: 10, minHeight: 280 }}>
                  <View style={{ minWidth: 280, width: '100%', alignItems: 'center' }}>
                    <DateTimePicker
                      value={tempEndDate} // Use temp value
                      textColor={themeColors.text}
                      accentColor={themeColors.mountainGreen}
                      minimumDate={startDate}
                      themeVariant={colorScheme === "light" ? "light" : "dark"}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleEndDateChange} // Store in temp
                      style={{ minHeight: 280, minWidth: 280, width: '100%' }} // Ensure minimum width
                    />
                  </View>
                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={confirmEndDate}
                    style={{
                      marginTop: 16,
                      marginBottom: 16,
                      backgroundColor: themeColors.mountainGreen,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </ThemedView>
  );
};

export default DateTime;