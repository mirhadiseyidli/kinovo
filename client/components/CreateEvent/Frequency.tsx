import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, Alert, ActionSheetIOS, Dimensions, Animated, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import CheckBox from '@react-native-community/checkbox';
import { DatePickerChangeHandler } from '@/types/allTypes';

const { width } = Dimensions.get('window');
const getFontSize = (percentage: number) => (width * percentage) / 100;

const Frequency: React.FC = () => {
  const colorScheme = useColorScheme();
  const [isRecurring, setIsRecurring] = useState(false);
  const [unit, setUnit] = useState('Daily');
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const colorAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(0))[0];
  const themeColors = Colors[colorScheme ?? 'dark'];

  const toggleCheck = (newValue: boolean) => {
    setIsRecurring(newValue);
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
          if (buttonIndex === 0) setUnit('Daily');
          else if (buttonIndex === 1) setUnit('Weekly');
          else if (buttonIndex === 2) setUnit('Monthly');
          else if (buttonIndex === 3) setUnit('Yearly');
        }
      );
    } else {
      Alert.alert('Select Unit', '', [
        { text: 'Daily', onPress: () => setUnit('Daily') },
        { text: 'Weekly', onPress: () => setUnit('Weekly') },
        { text: 'Monthly', onPress: () => setUnit('Monthly') },
        { text: 'Yearly', onPress: () => setUnit('Yearly') },
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
    }
  };

  return (
    <ThemedView style={{ padding: 16, borderRadius: 8, backgroundColor: Colors[colorScheme ?? 'dark'].inputBackgroundColor, marginBottom: 16 }}>
      {/* Selection: Only Once / Recurring */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <CheckBox
          value={isRecurring}
          onValueChange={toggleCheck}
          boxType="square"
          tintColor={themeColors.placeholderTextColor} // Unchecked color
          onTintColor={themeColors.text} // Border color when checked
          onCheckColor={themeColors.text} // Checkmark color
          tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor }}
          style={{ height: 16, width: 16, marginRight: 10 }} // Adjusted size and spacing
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
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={openUnitOptions}
              >
                <ThemedText style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text }}>
                  {unit}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* End Date Picker */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text, marginRight: 8 }}>End on</Text>
              <TouchableOpacity onPress={openDatePicker} style={{
                backgroundColor: Colors[colorScheme ?? 'dark'].background,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'dark'].text }}>{endDate.toDateString()}</Text>
              </TouchableOpacity>
              
              {/* Use a modal for iOS to prevent layout shift */}
              {showDatePicker && (
                <Modal transparent={true} animationType="fade" visible={showDatePicker} >
                  <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', minHeight: 280 }}>
                      <View style={{ backgroundColor: themeColors.background, padding: 20, borderRadius: 10, minWidth: 280, width: '100%', }}>
                        <DateTimePicker
                          value={endDate}
                          mode="date"
                          minimumDate={new Date()}
                          display="inline" // Fixes empty modal issue
                          textColor={themeColors.text}
                          accentColor={themeColors.mountainGreen}
                          themeVariant={colorScheme === "light" ? "light" : "dark"}
                          onChange={handleDateChange}
                          style={{ minWidth: 280, width: '100%' }} // Ensure minimum width
                        />
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
