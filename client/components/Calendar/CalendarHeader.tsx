import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { IconSymbol } from '../ui/IconSymbol';
import NotificationsButton from '../NotificationsButton';
import NavigateBackButton from '../NavigateBackButton';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { CalendarHeaderProps } from '@/types/allTypes';
import { format } from 'date-fns';

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ currentDate, setDate, onMonthYearChange }) => {
  const [showMonthList, setShowMonthListLocal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const rotateAnim = useState(new Animated.Value(0))[0];
  const scrollViewRef = useRef<ScrollView>(null);
  const [chipLayouts, setChipLayouts] = useState<{ [key: string]: { x: number; width: number } }>({});
  const [justOpened, setJustOpened] = useState(false);
  const today = new Date();
  
  const generateMonthRoutes = () => {
    const routes = [];
    for (let yearOffset = -5; yearOffset <= 5; yearOffset++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(currentDate.getFullYear() + yearOffset, month, 1);
        routes.push({
          key: `${date.getFullYear()}-${month}`,
          title: format(date, 'MMM'),
          month: month,
          year: date.getFullYear(),
        });
      }
    }
    return routes;
  };

  const monthRoutes = generateMonthRoutes();
  const [selectedRoute, setSelectedRoute] = useState(`${currentDate.getFullYear()}-${currentDate.getMonth()}`);

  const toggleMonthList = () => {
    const newState = !showMonthList;
    Animated.timing(rotateAnim, {
      toValue: newState ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setShowMonthListLocal(newState);
    if (newState === true) {
      setJustOpened(true);
    }
  };

  const handleChipPress = (routeKey: string, route: { month: number; year: number }) => {
    setSelectedRoute(routeKey);
    if (scrollViewRef.current && chipLayouts[routeKey]) {
      scrollViewRef.current.scrollTo({ x: chipLayouts[routeKey].x, animated: true });
    }

    onMonthYearChange?.(route.month, route.year);
  };

  useEffect(() => {
    if (showMonthList && scrollViewRef.current && chipLayouts[selectedRoute]) {
      scrollViewRef.current.scrollTo({ 
        x: chipLayouts[selectedRoute].x, 
        animated: justOpened ? false : true 
      });
      if (justOpened) {
        setJustOpened(false);
      }
    }
  }, [showMonthList, selectedRoute, chipLayouts, justOpened]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-270deg', '270deg'],
  });

  const selectedRouteData = monthRoutes.find(route => route.key === selectedRoute);

  return (
    <ThemedView 
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 16
      }}
    >
      <ThemedView style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={toggleMonthList}>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 24 }}>
              {selectedRouteData ? `${selectedRouteData.title} ${selectedRouteData.year}` : 'Month'}
            </ThemedText>
            <Animated.View style={{ transform: [{ rotate }], marginLeft: 4, marginTop: 2 }}>
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={themeColors.text}
              />
            </Animated.View>
          </ThemedView>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={() =>
            handleChipPress(
              `${today.getFullYear()}-${today.getMonth()}`,
              { month: today.getMonth(), year: today.getFullYear() }
            )
          }
          style={{ marginLeft: 16 }}
        >
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Feather
                name="calendar"
                size={36}
                color={
                  selectedRoute === `${today.getFullYear()}-${today.getMonth()}`
                    ? themeColors.mountainGreen
                    : themeColors.placeholderTextColor
                }
              />
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', bottom: 6 }}>
                <ThemedText 
                  style={{ 
                    color: selectedRoute === `${today.getFullYear()}-${today.getMonth()}`
                      ? themeColors.mountainGreen
                      : themeColors.placeholderTextColor, 
                    fontWeight: '600', 
                    fontSize: 14 
                  }}
                >
                  {today.getDate()}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
          <ThemedView style={{ alignItems: 'center' }}>
            <NotificationsButton refreshing={refreshing} count={3} />
          </ThemedView>
        </View>
      </ThemedView>
      {showMonthList && (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16, width: '100%' }}
        >
          {monthRoutes.map((route, index) => (
            <React.Fragment key={route.key}>
              {(index === 0 || route.year !== monthRoutes[index - 1].year) && (
                <ThemedText
                  style={{ alignSelf: 'center', marginHorizontal: 8, color: themeColors.text }}
                >
                  {route.year}
                </ThemedText>
              )}
              <TouchableOpacity
                onPress={() => handleChipPress(route.key, route)}
                onLayout={(event) => {
                  const layout = event.nativeEvent?.layout;
                  if (layout) {
                    setChipLayouts((prev) => ({
                      ...prev,
                      [route.key]: layout,
                    }));
                  }
                }}
              >
                <ThemedView
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      selectedRoute === route.key
                        ? themeColors.mountainGreen
                        : themeColors.inputBackgroundColor,
                    marginRight: 8,
                  }}
                >
                  <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>
                    {route.title}
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
};

export default CalendarHeader;
