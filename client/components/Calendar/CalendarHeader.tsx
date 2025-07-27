import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Dimensions, TouchableOpacity, FlatList, Text, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import NotificationsButton from '../NotificationsButton';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MonthItem } from '@/types/allTypes';
import { format } from 'date-fns';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Layout, LinearTransition, useDerivedValue, withSpring, FadeIn, useAnimatedReaction } from 'react-native-reanimated';
import MonthListToggle from './CalendarHeader/MonthListToggle';
import CurrentMonthSelector from './CalendarHeader/CurrentMonthSelector';
import { getSelectedItem, buildWindow, buildYearMonths } from './CalendarHeader/utils';
import { MonthChip } from './CalendarHeader/MonthChips';
import Picker from '../PickerCustom';
import ReanimatedShimmerLine from '../CustomLoadingIndicatingLine';
import MonthChipView from './CalendarHeader/MonthChipView';
import MonthSmallView from './CalendarHeader/MonthSmallView';
import { generateMonthGrid } from './CalendarHeader/utils';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useCalendarContext } from '@/context/CalendarProvider.v2';
import { useNotifications } from '@/hooks/useNotifications';
import { Feather } from '@expo/vector-icons';
import { useCalendarError } from '@/context/CalendarErrorContext';
import { CalendarErrorMessage } from './CalendarErrorMessage';

interface CalendarHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const CalendarHeaderMonthView: React.FC<CalendarHeaderProps> = ({ refreshing, onRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { view, setView } = useCalendarViewContext();
  const { currentDate, setCurrentDate, navigateToToday } = useCalendarContext();
  const { errors, hasAnyError } = useCalendarError();
  const [monthListOpen, setMonthListOpen] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const CELL_SIZE = screenWidth / 7;
  const HEADER_HEIGHT = (12 * 2) + 6; // Total non-grid height: vertical padding (16 top + 16 bottom) + label row marginBottom (6)
  const CELL_HEIGHT = CELL_SIZE * 0.75; // Cell height smaller than width for a more compact grid
  const CHIP_WIDTH = 64; // chip width + horizontal margins. Constant for FlatList chip width and recycling buffer
  const fromChipRef = useRef(false);
  
  const opacity = useSharedValue(0);
  const height = useSharedValue(0);
  const isMonthListOpen = useSharedValue(false);
  const currentView = useSharedValue(view);
  const wrapperHeightValue = useSharedValue(0);

  const [data, setData] = useState<MonthItem[]>(() =>  // FlatList data and selection state
    buildWindow(currentDate.getFullYear())
  );

  // Performance optimization: Memoize expensive title calculations
  const title = React.useMemo(() => format(currentDate, 'MMM'), [currentDate?.getTime()]);
  const month = React.useMemo(() => currentDate.getMonth(), [currentDate?.getTime()]);
  const year = React.useMemo(() => currentDate.getFullYear(), [currentDate?.getTime()]);
  const today = new Date();
  const [selectedKey, setSelectedKey] = useState(() => {
    return `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  });

  const listRef = useRef<FlatList<MonthItem>>(null);
  const { unseenNotificationCount } = useNotifications();

  // Update selectedKey when currentDate changes
  useEffect(() => {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    setSelectedKey(key);
    
    // Update data if needed for new year
    let idx = data.findIndex(i => i.key === key);
    if (idx < 0) {
      const newWindow = buildWindow(currentDate.getFullYear());
      setData(newWindow);
      idx = newWindow.findIndex(i => i.key === key);
    }

    // Scroll to current item
    if (idx >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: (idx + 1) * CHIP_WIDTH,
          animated: true,
        });
      });
    }
  }, [currentDate, data]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => { // Handle recycling months when scrolling reaches buffer zones
    const offsetX = e.nativeEvent.contentOffset.x;
    const centerIndex = Math.round(offsetX / CHIP_WIDTH);
    
    if (centerIndex < 0 || centerIndex >= data.length) return; // guard against out-of-bounds during fast scrolls
    const centerItem = data[centerIndex];
    const minYear = data[0].year;
    const maxYear = data[data.length - 1].year;

    if (centerItem.year === minYear) {
       
      const prevMonths = buildYearMonths(minYear - 1); // prepend the year before the first
      const newData = [...prevMonths, ...data].slice(0, 36);
      setData(newData);
      
      const newOffset = offsetX + 12 * CHIP_WIDTH; // adjust offset so chips stay in place
      listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
    } else if (centerItem.year === maxYear) {
      
      const nextMonths = buildYearMonths(maxYear + 1); // append the year after the last
      const newData = [...data, ...nextMonths].slice(-36);
      setData(newData);
      
      const newOffset = offsetX - 12 * CHIP_WIDTH; // adjust offset so chips stay in place
      listRef.current?.scrollToOffset({ offset: newOffset, animated: false });
    }
  };

  const [wrapperHeight, setWrapperHeight] = useState(() => {
    const days = generateMonthGrid(currentDate);
    const rows = days.length / 7;
    return rows * CELL_HEIGHT + HEADER_HEIGHT;
  });

  const renderItem = useCallback(
    ({ item }: { item: MonthItem }) => {
      const isSelected = item.key === selectedKey;
      return (
        <MonthChip
          item={item}
          isSelected={isSelected}
          onMonthYearChange={(month, year, day, fromDropdown) => {
            fromChipRef.current = fromDropdown;
            // Preserve current day when changing month/year, especially important for week view
            const currentDay = view === 'Week' ? currentDate.getDate() : 1;
            setCurrentDate(new Date(year, month, currentDay));
          }}
          CHIP_WIDTH={CHIP_WIDTH}
          fromChipRef={fromChipRef}
        />
      );
    },
    [selectedKey, setCurrentDate]
  );

  // Update shared values without accessing during render
  useEffect(() => {
    isMonthListOpen.value = monthListOpen;
  }, [monthListOpen]);

  useEffect(() => {
    currentView.value = view;
  }, [view]);

  useEffect(() => {
    wrapperHeightValue.value = wrapperHeight;
  }, [wrapperHeight]);

  // Handle height animation in worklet
  useAnimatedReaction(
    () => ({
      isOpen: isMonthListOpen.value,
      view: currentView.value,
      height: wrapperHeightValue.value
    }),
    (current) => {
      const targetHeight = current.isOpen
        ? (current.view === 'Month' ? 42 : (46 + current.height))
        : 0;
      height.value = withTiming(targetHeight, { duration: 200 });
      opacity.value = withTiming(current.isOpen ? 1 : 0, { duration: 200 });
    }
  );

  // Prevent initial layout jumps by stabilizing on mount
  useEffect(() => {
    height.value = 0;
    opacity.value = 0;
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  // Animated slide-in/out for MonthSmallView
  const showSmallView = useDerivedValue(() => {
    return currentView.value !== 'Month' && isMonthListOpen.value ? 1 : 0;
  });

  const monthSmallViewStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(showSmallView.value * wrapperHeightValue.value, {
        damping: 20,
        stiffness: 300,
      }),
      opacity: showSmallView.value,
      overflow: 'hidden',
    };
  });

  const handleRefresh = useCallback(async () => {
    if (!refreshing) {
      try {
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error refreshing events:', error);
        if (onRefresh) {
          onRefresh(); // Still call onRefresh to reset the refreshing state
        }
      }
    }
  }, [onRefresh, refreshing]);

  const handleViewChange = (selectedView: string) => {
    if (selectedView !== view) {
      setView(selectedView, 'header_picker');
      // Navigate to today when explicitly switching to week view via picker
      if (selectedView === 'Week') {
        navigateToToday();
      }
    }
  };

  return (
    <ThemedView 
      style={{
        alignItems: 'center',
        width: '100%',
        // minHeight: 120, // Fixed minimum height to prevent jumping
      }}
    >
      <ThemedView style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
        <MonthListToggle
          title={title}
          year={year}
          monthListOpen={monthListOpen}
          setMonthListOpen={setMonthListOpen}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            onPress={handleRefresh}
            disabled={refreshing}
            style={{ 
              opacity: refreshing ? 0.5 : 1,
              padding: 6,
            }}
          >
            <Feather name="refresh-cw" size={18} color={themeColors.text} />
          </TouchableOpacity>
          <CurrentMonthSelector
            currentDate={currentDate}
            today={today}
            fromChipRef={fromChipRef}
          />
          <ThemedView style={{ alignItems: 'center' }}>
            <NotificationsButton refreshing={refreshing} count={unseenNotificationCount} />
          </ThemedView>
        </View>
      </ThemedView>
      <Animated.View style={[animatedStyle, { flexDirection: 'column', width: '100%' } ]}>
        <Animated.View style={monthSmallViewStyle}>
          <MonthSmallView 
            currentDate={currentDate}
            wrapperHeight={wrapperHeight}
            setWrapperHeight={setWrapperHeight}
            onMonthYearChange={(month, year, day, fromDropdown) => {
              fromChipRef.current = fromDropdown;
              // Preserve current day when changing month/year, especially important for week view
              const currentDay = view === 'Week' ? currentDate.getDate() : 1;
              setCurrentDate(new Date(year, month, currentDay));
            }}
            fromChipRef={fromChipRef}
          />
        </Animated.View>
        <MonthChipView 
          listRef={listRef}
          data={data}
          selectedKey={selectedKey}
          renderItem={renderItem}
          CHIP_WIDTH={CHIP_WIDTH}
          handleMomentumScrollEnd={handleMomentumScrollEnd}
        />
      </Animated.View>
      
      {/* Error Message */}
      {hasAnyError && (
        <CalendarErrorMessage 
          errors={errors} 
          showCachedDataWarning={true} 
          currentView={view as 'Month' | 'Week' | 'Schedule'}
        />
      )}
      
      <ThemedView style={{ 
        paddingHorizontal: 16, 
        marginBottom: 8, 
        width: '100%', 
        alignItems: 'center',
        height: 34, // Fixed height for picker container
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <Picker setMonthListOpen={setMonthListOpen} />
      </ThemedView>
    </ThemedView>
  );
};

export default CalendarHeaderMonthView;
