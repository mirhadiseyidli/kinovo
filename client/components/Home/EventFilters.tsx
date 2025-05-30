import React, { useState, useMemo, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { Picker } from 'react-native-wheel-pick';

export type FilterType = 'year' | 'month' | 'all';

export interface DateFilter {
  type: FilterType;
  date: Date | null;
}

interface EventFiltersProps {
  visible: boolean;
  onClose: () => void;
  activeFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EventFilters: React.FC<EventFiltersProps> = ({
  visible,
  onClose,
  activeFilter,
  onFilterChange,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(activeFilter.date || new Date());
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>(activeFilter.type);
  
  // Animation for the slide-up effect
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  // Generate years from 2000 to current year + 5
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2000 + 6 }, (_, i) => (2000 + i).toString());
  }, []);

  // Handle modal animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleFilterSelect = (type: FilterType) => {
    setSelectedFilterType(type);
    if (type === 'all') {
      onFilterChange({ type: 'all', date: null });
      onClose();
    } else {
      setShowDatePicker(true);
    }
  };

  const handleCancel = () => {
    setShowDatePicker(false);
    setSelectedFilterType(activeFilter.type);
    setTempDate(activeFilter.date || new Date());
  };

  const handleConfirm = () => {
    onFilterChange({
      type: selectedFilterType,
      date: tempDate,
    });
    setShowDatePicker(false);
    onClose();
  };

  const renderDatePicker = () => {
    if (selectedFilterType === 'year') {
      return (
        <Picker
          style={{ backgroundColor: themeColors.background }}
          selectedValue={tempDate.getFullYear().toString()}
          pickerData={years}
          onValueChange={(value: string) => {
            const newDate = new Date(tempDate);
            newDate.setFullYear(parseInt(value));
            setTempDate(newDate);
          }}
          textColor={themeColors.text}
        />
      );
    } else if (selectedFilterType === 'month') {
      return (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Picker
              style={{ backgroundColor: themeColors.background }}
              selectedValue={MONTHS[tempDate.getMonth()]}
              pickerData={MONTHS}
              onValueChange={(value: string) => {
                const newDate = new Date(tempDate);
                newDate.setMonth(MONTHS.indexOf(value));
                setTempDate(newDate);
              }}
              textColor={themeColors.text}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Picker
              style={{ backgroundColor: themeColors.background }}
              selectedValue={tempDate.getFullYear().toString()}
              pickerData={years}
              onValueChange={(value: string) => {
                const newDate = new Date(tempDate);
                newDate.setFullYear(parseInt(value));
                setTempDate(newDate);
              }}
              textColor={themeColors.text}
            />
          </View>
        </View>
      );
    }
    return null;
  };

  const filters: { type: FilterType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { type: 'all', label: 'All Events', icon: 'calendar' },
    { type: 'year', label: 'Filter by Year', icon: 'calendar' },
    { type: 'month', label: 'Filter by Month', icon: 'calendar' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
            }}
          >
            <ThemedView
              style={{
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                minHeight: 300,
              }}
            >
              {/* Drag handle indicator */}
              <View style={{
                alignSelf: 'center',
                width: 50,
                height: 5,
                backgroundColor: themeColors.placeholderTextColor,
                borderRadius: 3,
                marginTop: -5,
                marginBottom: 15,
                opacity: 0.7,
              }} />
              
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingVertical: 10,
                  marginHorizontal: -20,
                  paddingHorizontal: 20,
                }}
              >
                <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {showDatePicker ? 'Select Date' : 'Filter Events'}
                </ThemedText>
                <TouchableOpacity onPress={showDatePicker ? handleCancel : onClose}>
                  <Feather name="x" size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>

              {!showDatePicker ? (
                <ScrollView>
                  {filters.map((filter) => (
                    <TouchableOpacity
                      key={filter.type}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor:
                          filter.type === activeFilter.type
                            ? themeColors.cardColorsGradientOne
                            : 'transparent',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                      onPress={() => handleFilterSelect(filter.type)}
                    >
                      <Feather
                        name={filter.icon}
                        size={20}
                        color={themeColors.text}
                        style={{ marginRight: 12 }}
                      />
                      <ThemedText style={{ fontSize: 16 }}>{filter.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View>
                  {renderDatePicker()}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                    <TouchableOpacity
                      onPress={handleCancel}
                      style={{
                        padding: 12,
                        backgroundColor: themeColors.cardColorsGradientOne,
                        borderRadius: 8,
                        flex: 1,
                        marginRight: 8,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Cancel</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirm}
                      style={{
                        padding: 12,
                        backgroundColor: themeColors.mountainGreen,
                        borderRadius: 8,
                        flex: 1,
                        marginLeft: 8,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Confirm</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ThemedView>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default EventFilters; 