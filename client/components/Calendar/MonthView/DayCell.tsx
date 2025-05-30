import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { DayCellProps } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useEventContext } from '@/context/EventContext';

const DayCell = React.memo<DayCellProps>(({ date, month, today, cellWidth, cellHeight, handleMonthYearChange }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { view, setView } = useCalendarViewContext();
  const { getOccurrencesForDate } = useEventContext();
  
  const dayOccurrences = React.useMemo(
    () => getOccurrencesForDate(date),
    [getOccurrencesForDate, date]
  );

  const isCurrentMonth = date.getMonth() === month;
  const isToday = isCurrentMonth && date.toDateString() === today.toDateString();

  const openSchedule = (date: Date) => {
    setView('Schedule');
    handleMonthYearChange(date.getMonth(), date.getFullYear(), date.getDate(), false);
  }
  
  return (
    <TouchableOpacity
      onPress={() => openSchedule(date)}
      style={{
        paddingHorizontal: 2,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: cellWidth,
        height: cellHeight,
        borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
        borderColor: themeColors.calendarBorderColor,
      }}
    >
      <View style={{
        width: cellWidth * 0.4,
        height: cellWidth * 0.4,
        borderRadius: (cellWidth * 0.6) / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        backgroundColor: isToday ? themeColors.mountainGreen : undefined,
      }}>
        <Text style={{ color: themeColors.text, fontSize: 12, opacity: isCurrentMonth ? 1 : 0.5 }}>
          {date.getDate()}
        </Text>
      </View>

      {dayOccurrences.slice(0, 3).map(occurrence => {
        // Determine styling based on user status
        const userStatus = occurrence.event.userStatus;
        let backgroundColor = occurrence.isModified ? themeColors.tint : themeColors.mountainGreen;
        let borderColor = 'transparent';
        let borderWidth = 0;
        let opacity = isCurrentMonth ? 1 : 0.5;
        let textStyle: any = { 
          color: themeColors.text, 
          fontSize: 10, 
          fontWeight: '600' 
        };

        if (userStatus === 'rejected') {
          backgroundColor = 'transparent';
          borderColor = themeColors.mountainGreen;
          borderWidth = 1;
          textStyle = {
            ...textStyle,
            textDecorationLine: 'line-through',
            opacity: 0.7,
          };
        } else if (userStatus === 'maybe') {
          backgroundColor = themeColors.background;
          borderColor = themeColors.mountainGreen;
          borderWidth = 1;
          textStyle = {
            ...textStyle,
            fontWeight: 'bold',
          };
        }

        return (
          <View
            key={occurrence.id}
            style={{ 
              marginTop: 2, 
              width: '100%', 
              borderRadius: 3, 
              paddingLeft: 4, 
              paddingVertical: 1, 
              justifyContent: 'center', 
              backgroundColor: backgroundColor,
              borderColor: borderColor,
              borderWidth: borderWidth,
              opacity: opacity,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Striped pattern for 'maybe' status */}
            {userStatus === 'maybe' && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                zIndex: 1,
              }}>
                {Array.from({ length: Math.ceil((cellWidth + cellHeight) / 4) }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: Math.sqrt(cellWidth * cellWidth + cellHeight * cellHeight) + 10,
                      backgroundColor: themeColors.mountainGreen,
                      transform: [
                        { translateX: i * 6 - cellWidth * 0.5 },
                        { translateY: -cellHeight * 0.5 },
                        { rotate: '45deg' }
                      ],
                    }}
                  />
                ))}
              </View>
            )}
            <Text
              style={{...textStyle, zIndex: 2, position: 'relative'}}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {occurrence.event.title}
            </Text>
          </View>
        );
      })}

      {dayOccurrences.length > 3 && (
        <View style={{ marginTop: 2, width: '100%', borderRadius: 3, paddingLeft: 4, paddingVertical: 1, justifyContent: 'center', backgroundColor: themeColors.mountainGreen }}>
          <Text style={{ color: themeColors.text, fontSize: 10, fontWeight: '600' }}>
            +{dayOccurrences.length - 3} more
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default DayCell;