import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, TouchableWithoutFeedback, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import type { DateTimeState, DatePickerChangeHandler } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';

const DateTime: React.FC = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { settingEventStartTime, settingEventEndTime } = useCreateEventContext();

  const [startDate, setStartDate] = useState<DateTimeState['startDate']>(new Date());
  const [endDate, setEndDate] = useState<DateTimeState['endDate']>(new Date());
  const [showStartPicker, setShowStartPicker] = useState<DateTimeState['showStartPicker']>(false);
  const [showEndPicker, setShowEndPicker] = useState<DateTimeState['showEndPicker']>(false);
  const [tempStartDate, setTempStartDate] = useState<DateTimeState['tempStartDate']>(startDate);
  const [tempEndDate, setTempEndDate] = useState<DateTimeState['tempEndDate']>(endDate);

  const handleStartDateChange: DatePickerChangeHandler = (event, selectedDate) => {
    if (selectedDate) setTempStartDate(selectedDate);
    settingEventStartTime(selectedDate ?? null);
  };
  
  const handleEndDateChange: DatePickerChangeHandler = (event, selectedDate) => {
    if (selectedDate) setTempEndDate(selectedDate);
    settingEventEndTime(selectedDate ?? null);
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <ThemedView
        style={{
          alignSelf: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          width: '100%',
          borderRadius: 8,
          backgroundColor: themeColors.inputBackgroundColor,
          elevation: 5,
        }}
      >
        {/* Dotted Line */}
        <View
          style={{
            position: 'absolute',
            top: 43,
            bottom: 12,
            left: 25,
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '40%',
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={{
                width: 1,
                height: 4,
                backgroundColor: themeColors.placeholderTextColor,
                marginBottom: 2,
              }}
            />
          ))}
        </View>

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
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: '400', textAlign: 'right', color: themeColors.text }}>
              {`${startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Start Date Picker Modal */}
        {showStartPicker && (
          <Modal transparent={true} animationType="fade" visible={showStartPicker}>
            <TouchableWithoutFeedback onPress={() => setShowStartPicker(false)}>
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
                    onPress={() => {
                      setStartDate(tempStartDate); // Confirm selection
                      setShowStartPicker(false);
                    }}
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
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: '400', textAlign: 'right', color: themeColors.text }}>
              {`${endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* End Date Picker Modal */}
        {showEndPicker && (
          <Modal transparent={true} animationType="fade" visible={showEndPicker}>
            <TouchableWithoutFeedback onPress={() => setShowEndPicker(false)}>
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
                    onPress={() => {
                      setEndDate(tempEndDate); // Confirm selection
                      setShowEndPicker(false);
                    }}
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
    </ThemedView>
  );
};

export default DateTime;