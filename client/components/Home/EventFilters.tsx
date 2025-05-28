import React, { useState, useMemo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { Picker } from 'react-native-wheel-pick';

export type FilterType = 'year' | 'month' | 'day' | 'all';

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

  // Generate years from 2000 to current year + 5
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2000 + 6 }, (_, i) => (2000 + i).toString());
  }, []);

  // Generate days based on month and year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  }, [tempDate.getFullYear(), tempDate.getMonth()]);

  const filters: { type: FilterType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { type: 'all', label: 'All Events', icon: 'calendar' },
    { type: 'year', label: 'Filter by Year', icon: 'calendar' },
    { type: 'month', label: 'Filter by Month', icon: 'calendar' },
    { type: 'day', label: 'Filter by Day', icon: 'calendar' },
  ];

  const handleFilterSelect = (type: FilterType) => {
    setSelectedFilterType(type);
    if (type === 'all') {
      onFilterChange({ type: 'all', date: null });
      onClose();
    } else {
      setShowDatePicker(true);
    }
  };

  const handleYearChange = (yearStr: string) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(parseInt(yearStr));
    setTempDate(newDate);
  };

  const handleMonthChange = (monthName: string) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(MONTHS.indexOf(monthName));
    setTempDate(newDate);
  };

  const handleDayChange = (dayStr: string) => {
    const newDate = new Date(tempDate);
    newDate.setDate(parseInt(dayStr));
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    let finalDate = new Date(tempDate);
    
    // Adjust the date based on filter type
    if (selectedFilterType === 'year') {
      finalDate = new Date(tempDate.getFullYear(), 0, 1);
    } else if (selectedFilterType === 'month') {
      finalDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
    }
    
    onFilterChange({ type: selectedFilterType, date: finalDate });
    setShowDatePicker(false);
    onClose();
  };

  const handleCancel = () => {
    setShowDatePicker(false);
    if (!activeFilter.date) {
      setSelectedFilterType('all');
    }
  };

  const formatSelectedDate = (date: Date, type: FilterType) => {
    if (type === 'year') {
      return date.getFullYear().toString();
    } else if (type === 'month') {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      return date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderDatePicker = () => {
    const pickerStyle = {
      backgroundColor: themeColors.background,
      width: selectedFilterType === 'day' ? '32%' : '48%',
      height: 215,
    };

    if (selectedFilterType === 'year') {
      return (
        <View style={{ alignItems: 'center' }}>
          <Picker
            style={pickerStyle}
            selectedValue={tempDate.getFullYear().toString()}
            pickerData={years}
            onValueChange={handleYearChange}
            textColor={themeColors.text}
          />
        </View>
      );
    }

    if (selectedFilterType === 'month') {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Picker
            style={pickerStyle}
            selectedValue={MONTHS[tempDate.getMonth()]}
            pickerData={MONTHS}
            onValueChange={handleMonthChange}
            textColor={themeColors.text}
          />
          <Picker
            style={pickerStyle}
            selectedValue={tempDate.getFullYear().toString()}
            pickerData={years}
            onValueChange={handleYearChange}
            textColor={themeColors.text}
          />
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Picker
          style={pickerStyle}
          selectedValue={tempDate.getDate().toString().padStart(2, '0')}
          pickerData={days}
          onValueChange={handleDayChange}
          textColor={themeColors.text}
        />
        <Picker
          style={pickerStyle}
          selectedValue={MONTHS[tempDate.getMonth()]}
          pickerData={MONTHS}
          onValueChange={handleMonthChange}
          textColor={themeColors.text}
        />
        <Picker
          style={pickerStyle}
          selectedValue={tempDate.getFullYear().toString()}
          pickerData={years}
          onValueChange={handleYearChange}
          textColor={themeColors.text}
        />
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
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
          <ThemedView
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              minHeight: 300,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
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
                        activeFilter.type === filter.type
                          ? themeColors.cardColorsGradientOne
                          : 'transparent',
                      borderRadius: 12,
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
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 16 }}>{filter.label}</ThemedText>
                      {activeFilter.type === filter.type && activeFilter.date && filter.type !== 'all' && (
                        <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary, marginTop: 4 }}>
                          {formatSelectedDate(activeFilter.date, filter.type)}
                        </ThemedText>
                      )}
                    </View>
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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default EventFilters; 