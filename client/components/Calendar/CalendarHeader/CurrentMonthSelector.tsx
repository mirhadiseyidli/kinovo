import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useCalendarContext } from '@/context/CalendarProvider.v2';

interface CurrentMonthSelectorProps {
  currentDate: Date;
  today: Date;
  fromChipRef: React.RefObject<boolean>;
}

const CurrentMonthSelector: React.FC<CurrentMonthSelectorProps> = ({
  currentDate,
  today,
  fromChipRef
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { view } = useCalendarViewContext();
  const { setCurrentDate, navigateToToday } = useCalendarContext();
  
  const key = `${today.getFullYear()}-${today.getMonth()}`;
  const [selectedDateKey, setSelectedDateKey] = useState(`${currentDate.getFullYear()}-${currentDate.getMonth()}`);
  
  // Determine if we're showing "current" based on view
  const isCurrent = React.useMemo(() => {
    const viewType = view.toLowerCase();
    if (viewType === 'month') {
      // Current month check
      return currentDate.getFullYear() === today.getFullYear() && 
             currentDate.getMonth() === today.getMonth();
    } else if (viewType === 'week') {
      // Current week check - if today falls within the current week being viewed
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);
      
      const todayOnly = new Date(today);
      todayOnly.setHours(0, 0, 0, 0);
      
      return todayOnly >= weekStart && todayOnly <= weekEnd;
    } else {
      // Schedule view - exact day check
      return currentDate.getFullYear() === today.getFullYear() && 
             currentDate.getMonth() === today.getMonth() &&
             currentDate.getDate() === today.getDate();
    }
  }, [currentDate, today, view]);

  // Update selectedDateKey when currentDate changes
  useEffect(() => {
    setSelectedDateKey(`${currentDate.getFullYear()}-${currentDate.getMonth()}`);
  }, [currentDate]);

  const handlePress = () => {
    fromChipRef.current = true;
    
    // All views should navigate to today, which is the purpose of this button
    navigateToToday();
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Feather
          name="calendar"
          size={30}
          color={isCurrent ? themeColors.mountainGreen : themeColors.placeholderTextColor}
        />
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', bottom: 8 }}>
          <ThemedText
            style={{
              color: isCurrent ? themeColors.mountainGreen : themeColors.placeholderTextColor,
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            {today.getDate()}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CurrentMonthSelector;