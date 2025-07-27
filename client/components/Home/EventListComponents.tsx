import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Event } from '@/types/allTypes';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import PastEvent from '@/components/Home/PastEvent';

interface EventItemProps {
  event: Event;
  isError: boolean;
  refreshing: boolean;
  loading: boolean;
}

const EventItem = React.memo<EventItemProps>(({ event, isError, refreshing, loading }) => (
  <View key={event._id} style={{ opacity: isError ? 0.8 : 1 }}>
    <PastEvent
      key={event._id}
      event={event}
      loading={refreshing || loading}
    />
  </View>
));

EventItem.displayName = 'EventItem';

interface MonthEventsProps {
  month: string;
  monthEvents: Event[];
  isError: boolean;
  refreshing: boolean;
  loading: boolean;
  isLastMonth: boolean;
}

const MonthEvents = React.memo<MonthEventsProps>(({ 
  month, 
  monthEvents, 
  isError, 
  refreshing, 
  loading, 
  isLastMonth 
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ marginBottom: isLastMonth ? 0 : 16 }}>
      {/* Month Header */}
      <ThemedText style={{ 
        fontSize: 14, 
        fontWeight: '600', 
        marginBottom: 12, 
        color: themeColors.tint 
      }}>
        {month}
      </ThemedText>
      
      {/* Month Events */}
      <View style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16, 
        paddingBottom: 8 
      }}>
        {monthEvents.map((event) => (
          <EventItem
            key={event._id}
            event={event}
            isError={isError}
            refreshing={refreshing}
            loading={loading}
          />
        ))}
      </View>
    </View>
  );
});

MonthEvents.displayName = 'MonthEvents';

interface YearGroupProps {
  year: string;
  months: { [month: string]: Event[] };
  isError: boolean;
  refreshing: boolean;
  loading: boolean;
  sortMonthEntries: (entries: [string, Event[]][]) => [string, Event[]][];
}

const YearGroup = React.memo<YearGroupProps>(({ 
  year, 
  months, 
  isError, 
  refreshing, 
  loading, 
  sortMonthEntries 
}) => {
  const sortedMonths = React.useMemo(() => 
    sortMonthEntries(Object.entries(months)), 
    [months, sortMonthEntries]
  );

  return (
    <View key={year} style={{ marginBottom: 16 }}>
      {/* Year Header */}
      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        {year}
      </ThemedText>
      
      {/* Months */}
      {sortedMonths.map(([month, monthEvents], monthIndex, monthsArray) => (
        <MonthEvents
          key={`${year}-${month}`}
          month={month}
          monthEvents={monthEvents}
          isError={isError}
          refreshing={refreshing}
          loading={loading}
          isLastMonth={monthIndex === monthsArray.length - 1}
        />
      ))}
    </View>
  );
});

YearGroup.displayName = 'YearGroup';

interface GroupedEventsListProps {
  groupedEvents: { [year: string]: { [month: string]: Event[] } };
  isError: boolean;
  refreshing: boolean;
  loading: boolean;
  sortYearEntries: (entries: [string, { [month: string]: Event[] }][]) => [string, { [month: string]: Event[] }][];
  sortMonthEntries: (entries: [string, Event[]][]) => [string, Event[]][];
}

export const GroupedEventsList = React.memo<GroupedEventsListProps>(({ 
  groupedEvents, 
  isError, 
  refreshing, 
  loading, 
  sortYearEntries, 
  sortMonthEntries 
}) => {
  const sortedYears = React.useMemo(() => 
    sortYearEntries(Object.entries(groupedEvents)), 
    [groupedEvents, sortYearEntries]
  );

  return (
    <>
      {sortedYears.map(([year, months]) => (
        <YearGroup
          key={year}
          year={year}
          months={months}
          isError={isError}
          refreshing={refreshing}
          loading={loading}
          sortMonthEntries={sortMonthEntries}
        />
      ))}
    </>
  );
});

GroupedEventsList.displayName = 'GroupedEventsList';

interface FlatEventsListProps {
  events: Event[];
  isError: boolean;
  refreshing: boolean;
  loading: boolean;
}

export const FlatEventsList = React.memo<FlatEventsListProps>(({ 
  events, 
  isError, 
  refreshing, 
  loading 
}) => (
  <>
    {events.map((event) => (
      <EventItem
        key={event._id}
        event={event}
        isError={isError}
        refreshing={refreshing}
        loading={loading}
      />
    ))}
  </>
));

FlatEventsList.displayName = 'FlatEventsList';