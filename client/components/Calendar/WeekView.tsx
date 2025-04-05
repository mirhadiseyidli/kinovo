import { StyleSheet, Image, StatusBar, Dimensions, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { startOfMonth, endOfMonth, getDay, eachDayOfInterval } from 'date-fns';
import { ThemedText } from '../ThemedText';

export default function WeekView({ month, year }: { month: number, year: number }) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const cellWidth = Math.floor(screenWidth / 7);
  const cellHeight = screenWidth / 4;

  // Use the passed-in month and year to compute the current month's dates.
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysArray = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart); // Number of days to show from previous month

  // Compute previous month's days to fill the first week.
  const previousMonthEnd = new Date(year, month, 0); // Last day of previous month
  const previousDays = [];
  for (let i = previousMonthEnd.getDate() - startWeekday + 1; i <= previousMonthEnd.getDate(); i++) {
    previousDays.push(new Date(year, month - 1, i));
  }

  // Combine previous month's days with current month's days.
  let calendarDays = previousDays.concat(daysArray);

  // Fill remaining cells with next month's days until we have 42 cells (6 rows of 7).
  const totalCells = 42;
  const nextDaysCount = totalCells - calendarDays.length;
  const nextDays = [];
  for (let i = 1; i <= nextDaysCount; i++) {
    nextDays.push(new Date(year, month + 1, i));
  }
  calendarDays = calendarDays.concat(nextDays);

  const events = [
    { date: 7, title: 'Jazz', color: '#ec4899' },
    { date: 7, title: 'Football', color: '#ec4899' },
    { date: 7, title: 'Jazz', color: '#ec4899' },
    { date: 7, title: 'Jazz', color: '#ec4899' },
    { date: 7, title: 'Jazz', color: '#ec4899' },
    { date: 7, title: 'Blah', color: '#ec4899' },
    { date: 8, title: 'Tech', color: '#ec4899' },
    { date: 5, title: 'Web3', color: '#ec4899' },
    { date: 4, title: 'Web3', color: '#ec4899' },
    { date: 12, title: 'Hiking', color: '#ec4899' },
    { date: 15, title: 'Design', color: '#ec4899' },
    { date: 22, title: 'N2R2', color: '#6ee7b7' },
    { date: 29, title: 'N2R2', color: '#6ee7b7' },
  ];

  const renderEvents = (day: number) => {
    const dayEvents = events.filter(e => e.date === day);
    const visibleEvents = dayEvents.slice(0, 3);
    const remainingCount = dayEvents.length - visibleEvents.length;

    return (
      <>
        {visibleEvents.map((e, idx) => (
          <Text
            key={idx}
            style={{
              backgroundColor: themeColors.mountainGreen,
              color: themeColors.text,
              paddingHorizontal: 4,
              borderRadius: 4,
              overflow: 'hidden',
              fontSize: 10,
              fontWeight: '600',
              marginTop: 4,
              width: '100%',
              textAlign: 'left'
            }}
            numberOfLines={1}
          >
            {e.title}
          </Text>
        ))}
        {remainingCount > 0 && (
          <Text
            style={{
              backgroundColor: themeColors.mountainGreen,
              color: themeColors.text,
              paddingHorizontal: 4,
              borderRadius: 4,
              overflow: 'hidden',
              fontSize: 10,
              fontWeight: '600',
              marginTop: 4,
              width: '100%',
              textAlign: 'left'
            }}
            numberOfLines={1}
          >
            +{remainingCount} more
          </Text>
        )}
      </>
    );
  };

  return (
    <ThemedView style={{ flex: 1, overflow: 'hidden', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        {'SMTWTFS'.split('').map((d, i) => (
          <View key={i} style={{ width: cellWidth, alignItems: 'center', paddingVertical: 8 }}>
            <ThemedText style={{ fontWeight: '600' }}>{d}</ThemedText>
          </View>
        ))}
      </View>
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <ThemedView style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignItems: 'center', overflow: 'hidden' }}>
        {calendarDays.map((date, i) => {
          // Determine if the date belongs to the current month (from props)
          const isCurrentMonth = date.getMonth() === month;
          // Highlight today's date if it matches and is in the current month
          const isToday = date.toDateString() === (new Date()).toDateString() && isCurrentMonth;
          return (
            <ThemedView
              key={i}
              style={{
                width: cellWidth,
                height: cellHeight,
                paddingHorizontal: 4,
                borderRadius: 0,
                justifyContent: 'flex-start',
                alignItems: 'center',
                borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
                borderColor: themeColors.calendarBorderColor,
                backgroundColor: 'transparent',
                opacity: isCurrentMonth ? 1 : 0.5, // Adjacent month dates rendered with lower opacity
                overflow: 'hidden'
              }}
            >
              <View 
                style={{ 
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999, 
                  backgroundColor: isToday ? themeColors.mountainGreen : 'transparent', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: themeColors.text }}>{date.getDate()}</Text>
              </View>
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  flex: 1,        
                }}
              >
                {renderEvents(date.getDate())}
              </View>
            </ThemedView>
          );
        })}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};
