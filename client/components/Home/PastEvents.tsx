import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PastEvent from '@/components/Home/PastEvent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Event } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import { useGetMyPastEvents } from '@/hooks/useGetMyPastEvents';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventFilters, { FilterType, DateFilter } from './EventFilters';
import { IconSymbol } from '@/components/ui/IconSymbol';

const THIS_MONTH = 'This Month';
const LAST_MONTH = 'Last Month';

interface GroupedEvents {
  [key: string]: {
    [key: string]: Event[];
  };
}

const groupEventsByYearAndMonth = (events: Event[]) => {
  if (!events || events.length === 0) return {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const grouped: GroupedEvents = {};

  // Sort events from newest to oldest
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.start_time || 0);
    const dateB = new Date(b.start_time || 0);
    return dateB.getTime() - dateA.getTime();
  });

  sortedEvents.forEach(event => {
    if (!event.start_time) return;
    
    const eventDate = new Date(event.start_time);
    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth();
    
    // Initialize year if not exists
    if (!grouped[eventYear]) {
      grouped[eventYear] = {};
    }

    // Determine month label
    let monthLabel: string;
    if (eventYear === currentYear && eventMonth === currentMonth) {
      monthLabel = THIS_MONTH;
    } else if (eventYear === currentYear && eventMonth === currentMonth - 1) {
      monthLabel = LAST_MONTH;
    } else {
      monthLabel = eventDate.toLocaleString('default', { month: 'long' });
    }

    // Initialize month if not exists
    if (!grouped[eventYear][monthLabel]) {
      grouped[eventYear][monthLabel] = [];
    }

    grouped[eventYear][monthLabel].push(event);
  });

  return grouped;
};

const filterEventsByDate = (events: Event[], filter: DateFilter) => {
  if (!events || events.length === 0) return [];
  
  // For 'all' type, return the original sorted array
  if (filter.type === 'all' || !filter.date) {
    return events.sort((a, b) => {
      const dateA = new Date(a.start_time || 0);
      const dateB = new Date(b.start_time || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  const filterDate = new Date(filter.date);
  
  return events.filter(event => {
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    
    switch (filter.type) {
      case 'year':
        return eventDate.getFullYear() === filterDate.getFullYear();
      case 'month':
        return eventDate.getFullYear() === filterDate.getFullYear() &&
               eventDate.getMonth() === filterDate.getMonth();
      default:
        return true;
    }
  }).sort((a, b) => {
    const dateA = new Date(a.start_time || 0);
    const dateB = new Date(b.start_time || 0);
    return dateB.getTime() - dateA.getTime();
  });
};

const PastEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = React.memo(({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const tabBarHeight = useBottomTabBarHeight();
  const { fetchMyPastEvents, loading } = useGetMyPastEvents();
  const [myPastEventsList, setMyPastEventsList] = useState<Event[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateFilter>({ type: 'all', date: null });
  const insets = useSafeAreaInsets();
  
  const fetchPastEvents = async () => {
    const myPastEvents = await fetchMyPastEvents();
    setMyPastEventsList(myPastEvents);
    onFinishRefresh();
  }
  
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchPastEvents();
      }
    }, [refreshing])
  );

  const filteredEvents = useMemo(() => {
    return filterEventsByDate(myPastEventsList, activeFilter);
  }, [myPastEventsList, activeFilter]);

  const getFilterLabel = () => {
    if (activeFilter.type === 'all') return 'All Events';
    if (!activeFilter.date) return 'Filter Events';
    
    const date = new Date(activeFilter.date);
    switch (activeFilter.type) {
      case 'year':
        return date.getFullYear().toString();
      case 'month':
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      default:
        return 'Filter Events';
    }
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header Section */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
          Event History
        </ThemedText>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setFilterModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 16, marginRight: 8 }}>
              {getFilterLabel()}
            </ThemedText>
            <Feather name="filter" size={14} color={Colors[colorScheme ?? 'dark'].tint} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      {!myPastEventsList || myPastEventsList.length === 0 ? (
        <View style={{ paddingTop: 16 }}>
          <View style={{
            backgroundColor: themeColors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: themeColors.border,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}>
            <View style={{ marginBottom: 12 }}>
              <IconSymbol
                name="clock.fill"
                size={32}
                color={themeColors.placeholderTextColor}
              />
            </View>
            <ThemedText 
              style={{ 
                fontSize: 16, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                marginBottom: 4,
                fontWeight: '600'
              }}
            >
              Your event history is empty
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              Past events will appear here once you attend them 🎈
            </ThemedText>
          </View>
        </View>
      ) : filteredEvents.length === 0 ? (
        <ThemedText>No events found for the selected filter</ThemedText>
      ) : (
        <View style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeFilter.type === 'all' ? (
            Object.entries(groupEventsByYearAndMonth(filteredEvents))
              .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
              .map(([year, months]) => (
                <View key={year} style={{ marginBottom: 16 }}>
                  {/* Year Header */}
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                    {year}
                  </ThemedText>
                  
                  {/* Months */}
                  {Object.entries(months)
                    .sort(([monthA], [monthB]) => {
                      if (monthA === THIS_MONTH) return -1;
                      if (monthB === THIS_MONTH) return 1;
                      if (monthA === LAST_MONTH) return -1;
                      if (monthB === LAST_MONTH) return 1;
                      return 0;
                    })
                    .map(([month, monthEvents], monthIndex, monthsArray) => (
                      <View key={`${year}-${month}`} style={{ marginBottom: monthIndex === monthsArray.length - 1 ? 0 : 16 }}>
                        {/* Month Header */}
                        <ThemedText style={{ fontSize: 14, fontWeight: '600', marginBottom: 12, color: themeColors.tint }}>
                          {month}
                        </ThemedText>
                        
                        {/* Month Events */}
                        <View style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
                          {monthEvents.map((event, eventIndex) => (
                            <PastEvent
                              key={event._id}
                              event={event}
                              loading={refreshing || loading}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                </View>
              ))
          ) : (
            filteredEvents.map((event) => (
              <PastEvent
                key={event._id}
                event={event}
                loading={refreshing || loading}
              />
            ))
          )}
        </View>
      )}

      <EventFilters
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    </ThemedView>
  );
});

export default PastEvents;