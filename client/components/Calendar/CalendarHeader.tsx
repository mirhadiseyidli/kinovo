import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Dimensions, TouchableOpacity, FlatList, Text, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import NotificationsButton from '../NotificationsButton';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { CalendarHeaderMonthViewRefProps, CalendarHeaderProps, MonthItem } from '@/types/allTypes';
import { format } from 'date-fns';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Layout, LinearTransition, useDerivedValue, withSpring, FadeIn } from 'react-native-reanimated';
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
import { useNotifications } from '@/hooks/useNotifications';
import { Feather } from '@expo/vector-icons';

const CalendarHeaderMonthView = forwardRef<CalendarHeaderMonthViewRefProps, CalendarHeaderProps>(({ currentDateRef, onMonthYearChange, refreshing, fromDropdownRef, onRefresh }, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [monthListOpen, setMonthListOpen] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const CELL_SIZE = screenWidth / 7;
  const HEADER_HEIGHT = (12 * 2) + 6; // Total non-grid height: vertical padding (16 top + 16 bottom) + label row marginBottom (6)
  const CELL_HEIGHT = CELL_SIZE * 0.75; // Cell height smaller than width for a more compact grid
  const CHIP_WIDTH = 64; // chip width + horizontal margins. Constant for FlatList chip width and recycling buffer
  const opacity = useSharedValue(0);
  const [data, setData] = useState<MonthItem[]>(() =>  // FlatList data and selection state
    buildWindow(currentDateRef.current.getFullYear())
  );
  const today = new Date();
  const height = useSharedValue(0);
  const currentSelectorRef  = useRef<React.ComponentRef<typeof CurrentMonthSelector>>(null); // internal refs for child components
  const [selectedKey, setSelectedKey] = useState(() => {
    return `${today.getFullYear()}-${today.getMonth()}`;
  });
  const title = format(currentDateRef.current, 'MMM');
  const month = currentDateRef.current.getMonth();
  const year = currentDateRef.current.getFullYear()
  const listRef = useRef<FlatList<MonthItem>>(null);
  const { view, setView } = useCalendarViewContext();
  const fromChipRef = useRef(false);
  const { unseenNotificationCount } = useNotifications();

  useImperativeHandle(ref, () => ({ // expose both toggle and "select this date" to your parent via ref
    update: (date: Date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      // 1) see if it's in our current window
      let idx = data.findIndex(i => i.key === key);
      
      // 2) if not, rebuild the 36‑month window around this date's year
      if (idx < 0) {
        const newWindow = buildWindow(date.getFullYear());
        setData(newWindow);
        // now recalc your index
        idx = newWindow.findIndex(i => i.key === key);
      }
      // 3) update selection and child selector
      setSelectedKey(key);
      currentSelectorRef.current?.update(date);

      const days = generateMonthGrid(date);
      const rows = days.length / 7;
      const newHeight = rows * CELL_HEIGHT + HEADER_HEIGHT;
      setWrapperHeight(newHeight);

      // 4) once your list's data has updated, scroll so the item is centered
      //    using scrollToIndex with viewPosition is more robust than manual offset
      requestAnimationFrame(() => {
        if (idx >= 0) {
          listRef.current?.scrollToOffset({
            offset: (idx + 1) * CHIP_WIDTH,
            animated: true,
          });
          }
        });
      },
  }));

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
    const days = generateMonthGrid(currentDateRef.current);
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
          onMonthYearChange={onMonthYearChange}
          CHIP_WIDTH={CHIP_WIDTH}
          fromChipRef={fromChipRef}
        />
      );
    },
    [onMonthYearChange, selectedKey]
  );

  useEffect(() => {
    const targetHeight = monthListOpen
      ? (view === 'Month' ? 42 : (46 + wrapperHeight))
      : 0;
    height.value = withTiming(targetHeight, { duration: 200 });
  }, [wrapperHeight, view, monthListOpen]);

  useEffect(() => {
    opacity.value = withTiming(monthListOpen ? 1 : 0, { duration: 200 });
  }, [monthListOpen]);

  // Prevent initial layout jumps by stabilizing on mount
  useEffect(() => {
    // Set initial stable state without animation on mount
    height.value = 0;
    opacity.value = 0;
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  // Animated slide-in/out for MonthSmallView
  const showSmallView = useDerivedValue(() => view !== 'Month' && monthListOpen ? 1 : 0);

  const monthSmallViewStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(showSmallView.value * wrapperHeight, {
        damping: 20,
        stiffness: 300,
      }),
      opacity: showSmallView.value,
      overflow: 'hidden',
    };
  });

  const handleRefresh = useCallback(() => {
  }, []);

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
            onPress={onRefresh}
            disabled={refreshing}
            style={{ 
              opacity: refreshing ? 0.5 : 1,
              padding: 6,
            }}
          >
            <Feather name="refresh-cw" size={18} color={themeColors.text} />
          </TouchableOpacity>
          <CurrentMonthSelector
            ref={currentSelectorRef}
            currentKeyRef={currentDateRef}
            today={today}
            onMonthYearChange={onMonthYearChange}
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
            currentDateRef={currentDateRef}
            wrapperHeight={wrapperHeight}
            setWrapperHeight={setWrapperHeight}
            onMonthYearChange={onMonthYearChange}
            fromDropdownRef={fromDropdownRef}
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
      <ReanimatedShimmerLine
        colors={[themeColors.background, themeColors.mountainGreen, themeColors.background]}
        backgroundColor="transparent"
        loading={refreshing}
      />
    </ThemedView>
  );
});

export default CalendarHeaderMonthView;
