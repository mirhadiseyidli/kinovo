import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { EditDateOfBirthProps, DatePickerChangeHandler } from '@/types/allTypes';
// import { DateTimePicker } from '@expo/ui/swift-ui';

const EditDateOfBirth = ({ dateOfBirth, setDateOfBirth }: EditDateOfBirthProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(dateOfBirth || new Date());

  const handleStartDateChange: DatePickerChangeHandler = (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
    if (selectedDate) {
      setTempStartDate(selectedDate); // Store temporary selection
    }
  };

  return (
    <View>
      {/* Display Date of Birth */}
      <View 
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>
            Date of Birth
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setShowStartPicker(true)}>
            {dateOfBirth 
              ? <ThemedText style={{ fontSize: 16, color: themeColors.text }}>{dateOfBirth.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</ThemedText>
              : <ThemedText style={{ fontSize: 16, color: themeColors.placeholderTextColor }}>{"Date of Birth"}</ThemedText>
            }
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Date Picker Modal */}
      {showStartPicker && (
        <Modal transparent={true} animationType="fade" visible={showStartPicker}>
          <TouchableWithoutFeedback onPress={() => setShowStartPicker(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: themeColors.background, padding: 20, borderRadius: 10, minHeight: 280 }}>
                <View style={{ minWidth: 280, width: '100%', alignItems: 'center' }}>
                  {/* <DateTimePicker
                    initialDate={tempStartDate.toISOString()}
                    color={themeColors.mountainGreen}
                    displayedComponents="dateAndTime"
                    variant="graphical"
                    onDateSelected={handleStartDateChange}
                    style={{ minHeight: 280, minWidth: 280, width: '100%' }}
                  /> */}
                  <DateTimePicker
                    value={tempStartDate} // Use temporary value
                    textColor={themeColors.text}
                    accentColor={themeColors.mountainGreen}
                    maximumDate={new Date()}
                    themeVariant={colorScheme === "light" ? "light" : "dark"}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                    onChange={handleStartDateChange} // Update temp value on change
                    style={{ minHeight: 280, minWidth: 280, width: '100%' }}
                  />
                </View>
                {/* Confirm Button for Android */}
                <TouchableOpacity
                  onPress={() => {
                    setDateOfBirth(tempStartDate);
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
    </View>
  );
};

export default EditDateOfBirth;