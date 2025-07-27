import React, { useCallback, useMemo } from 'react';
import { Dimensions, InteractionManager } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Picker } from '@expo/ui/swift-ui';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useCalendarContext } from '@/context/CalendarProvider.v2';

interface DropdownProps {
  setMonthListOpen: (state: boolean) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  setMonthListOpen,
  // selected,
  // onChange,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  // Memoize width calculation to prevent re-calculations
  const pickerWidth = useMemo(() => {
    const width = Dimensions.get('window').width;
    return Math.floor(width * 0.9); // Use Math.floor for consistent pixel values
  }, []);
  
  const dropdownOptions = ['Month', 'Week', 'Schedule']; // '3 Day', 'Day',
  const { view, setView } = useCalendarViewContext();
  const { navigateToToday } = useCalendarContext();
  
  // Memoize selectedIndex to prevent unnecessary recalculations
  const selectedIndex = useMemo(() => {
    const index = dropdownOptions.indexOf(view);
    return index >= 0 ? index : 0; // Fallback to 0 if view not found
  }, [view]);

  const handleViewChange = useCallback((newView: string) => {
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      setView(newView, 'header_picker');
      setMonthListOpen(false);
      
      // Navigate to today when switching views via picker
      navigateToToday();
    });
  }, [setView, setMonthListOpen, navigateToToday]);

  return (
    <Picker
      style={{ 
        width: pickerWidth,
        height: 36, // Fixed height to prevent jumping
      }}
      variant='segmented'
      color={themeColors.mountainGreen}
      options={dropdownOptions}
      selectedIndex={selectedIndex}
      onOptionSelected={({ nativeEvent: { index } }) => {
        handleViewChange(dropdownOptions[index]);
      }}
    />
  );
};

export default Dropdown;