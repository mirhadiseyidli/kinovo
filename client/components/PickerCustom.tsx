import React, { useCallback } from 'react';
import { Dimensions, InteractionManager } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Picker } from '@expo/ui/swift-ui';
import { useCalendarViewContext } from '@/context/CalendarViewContext';

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
  const width = Dimensions.get('window').width;
  const dropdownOptions = ['Month', 'Week', 'Schedule']; // '3 Day', 'Day',
  const { view, setView } = useCalendarViewContext();
  console.log(view)

  const handleViewChange = useCallback((view: string) => {
    InteractionManager.runAfterInteractions(() => {
      setView(view);
      setMonthListOpen(false);
    });
  }, []);

  return (
    <Picker
      style={{ width: width * 90 / 100 }}
      variant='segmented'
      color={themeColors.mountainGreen}
      options={dropdownOptions}
      selectedIndex={dropdownOptions.indexOf(view)}
      onOptionSelected={({ nativeEvent: { index } }) => {
        handleViewChange(dropdownOptions[index]);
      }}
    />
  );
};

export default Dropdown;