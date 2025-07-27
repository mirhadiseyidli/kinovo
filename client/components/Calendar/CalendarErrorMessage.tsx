import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { CalendarErrorState } from '@/context/CalendarErrorContext';

interface CalendarErrorMessageProps {
  errors: CalendarErrorState;
  showCachedDataWarning?: boolean;
  currentView?: 'Month' | 'Week' | 'Schedule';
}

export const CalendarErrorMessage: React.FC<CalendarErrorMessageProps> = ({ 
  errors, 
  showCachedDataWarning = true,
  currentView = 'Month'
}) => {
  // Count how many components have errors
  const errorCount = Object.values(errors).filter(Boolean).length;
  
  if (errorCount === 0) return null;

  // Build error message based on which components failed and current view
  const getErrorMessage = () => {
    if (errors.calendarData && errors.occurrences) {
      return 'Unable to load calendar data and event details';
    } else if (errors.calendarData) {
      // Customize message based on current view
      switch (currentView) {
        case 'Month':
          return 'Unable to load month view events';
        case 'Week':
          return 'Unable to load week view events';
        case 'Schedule':
          return 'Unable to load schedule view events';
        default:
          return 'Unable to load calendar events';
      }
    } else if (errors.occurrences) {
      return 'Unable to load event details';
    } else {
      return 'Unable to load calendar data';
    }
  };

  const message = getErrorMessage();
  const fullMessage = showCachedDataWarning 
    ? `⚠️ ${message}. Showing cached data - pull to refresh to retry`
    : `⚠️ ${message} - pull to refresh to retry`;

  return (
    <View style={{
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 193, 7, 0.3)',
    }}>
      <ThemedText style={{ 
        color: '#f59e0b',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center'
      }}>
        {fullMessage}
      </ThemedText>
    </View>
  );
};