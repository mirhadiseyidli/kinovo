import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, Alert, ActionSheetIOS, Dimensions, Animated, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
// import { DateTimePicker } from '@expo/ui/swift-ui';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { DatePickerChangeHandler } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import AnimatedCheckBox from '../AnimatedCheckBox';

const { width } = Dimensions.get('window');
const getFontSize = (percentage: number) => (width * percentage) / 100;

const Frequency: React.FC = () => {
  const colorScheme = useColorScheme();
  const [isRecurring, setIsRecurring] = useState(false);
  const [unit, setUnit] = useState<string | null>('Select');
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const colorAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(0))[0];
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { settingEventRecurrence  } = useCreateEventContext();

  const toggleCheck = (newValue: boolean) => {
    setIsRecurring(newValue);
    if (!newValue) {
      settingEventRecurrence({
        checked: false,
        frequency: null,
        end_date: null
      });
    } else if (unit && endDate) {
      settingEventRecurrence({
        checked: true,
        frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
        end_date: endDate
      });
    }
    Animated.timing(slideAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300, // Adjust speed for smooth expansion
      useNativeDriver: false,
    }).start();
    Animated.timing(colorAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300, // Adjust duration for smooth transition
      useNativeDriver: false,
    }).start();
  };

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themeColors.placeholderTextColor, themeColors.text], // Adjust colors as needed
  });

  const animatedHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 95], // Adjust height dynamically
  });

  const openUnitOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Cancel'],
          cancelButtonIndex: 4,
        },
        (buttonIndex) => {
          let selected = '';
          if (buttonIndex === 0) selected = 'Daily';
          else if (buttonIndex === 1) selected = 'Weekly';
          else if (buttonIndex === 2) selected = 'Monthly';
          else if (buttonIndex === 3) selected = 'Yearly';

          if (selected) {
            setUnit(selected);
            if (endDate) {
              settingEventRecurrence({
                checked: true,
                frequency: selected.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
                end_date: endDate
              });
            }
          }
        }
      );
    } else {
      Alert.alert('Select Unit', '', [
        { text: 'Daily', onPress: () => { setUnit('Daily'); if (endDate) { settingEventRecurrence({ checked: true, frequency: 'daily', end_date: endDate }); } } },
        { text: 'Weekly', onPress: () => { setUnit('Weekly'); if (endDate) { settingEventRecurrence({ checked: true, frequency: 'weekly', end_date: endDate }); } } },
        { text: 'Monthly', onPress: () => { setUnit('Monthly'); if (endDate) { settingEventRecurrence({ checked: true, frequency: 'monthly', end_date: endDate }); } } },
        { text: 'Yearly', onPress: () => { setUnit('Yearly'); if (endDate) { settingEventRecurrence({ checked: true, frequency: 'yearly', end_date: endDate }); } } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange: DatePickerChangeHandler = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate instanceof Date) {
      setEndDate(selectedDate);
      if (unit && selectedDate) {
        settingEventRecurrence({
          checked: true,
          frequency: unit.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
          end_date: selectedDate
        });
      }
    }
  };

  return (
    <ThemedView style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors[colorScheme ?? 'dark'].inputBackgroundColor, marginBottom: 16 }}>
      {/* Selection: Only Once / Recurring */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
        <AnimatedCheckBox
          value={isRecurring}
          onValueChange={toggleCheck}
          onCheckColor={themeColors.text} // checkmark color
          tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor  }} // border color states
          style={{ height: 18, width: 18 }} // size or any custom inline style
          topContainerStyle={{ marginRight: 10 }}
        />
        {/* Animated Text Color */}
        <Animated.Text style={{ fontSize: 16, color: interpolatedColor }}>
          Recurring
        </Animated.Text>
      </View>

      {/* Expanding Frequency Section */}
      <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        {isRecurring && (
          <View style={{ height: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>Repeat</Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors[colorScheme ?? 'dark'].background, // Dark background
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={openUnitOptions}
              >
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: Colors[colorScheme ?? 'dark'].text }}>
                  {unit}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* End Date Picker */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>End on</Text>
              <TouchableOpacity onPress={openDatePicker} style={{
                backgroundColor: Colors[colorScheme ?? 'dark'].background,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors[colorScheme ?? 'dark'].text }}>{endDate?.toDateString()}</Text>
              </TouchableOpacity>
              
              {/* Use a modal for iOS to prevent layout shift */}
              {showDatePicker && (
                <Modal transparent={true} animationType="fade" visible={showDatePicker} >
                  <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', minHeight: 280 }}>
                      <View style={{ backgroundColor: themeColors.background, padding: 20, borderRadius: 10, minWidth: 280, width: '100%', }}>
                        <DateTimePicker
                          value={endDate ?? new Date()}
                          mode="date"
                          minimumDate={new Date()}
                          display="inline" // Fixes empty modal issue
                          textColor={themeColors.text}
                          accentColor={themeColors.mountainGreen}
                          themeVariant={colorScheme === "light" ? "light" : "dark"}
                          onChange={handleDateChange}
                          style={{ minWidth: 280, width: '100%' }} // Ensure minimum width
                        />
                        {/* <DateTimePicker
                          initialDate={(endDate ?? new Date()).toISOString()}
                          color={themeColors.mountainGreen}
                          displayedComponents="dateAndTime"
                          variant="graphical"
                          onDateSelected={handleDateChange}
                          style={{ minHeight: 280, minWidth: 280, width: '100%' }}
                        /> */}
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </ThemedView>
  );
};

export default Frequency;
