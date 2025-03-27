import React, { useState, useEffect } from 'react';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useWindowDimensions } from 'react-native';
import AboutUser from './AboutUser';
import UserEvents from './UsersEvents';
import UserFriends from './UsersFriends';
import type { User, UserProp } from '@/types/allTypes';

export default function UserInfoTabs({ user }: UserProp) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const layout = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'about', title: 'About' },
    { key: 'events', title: 'Events' },
    { key: 'friends', title: 'Friends' },
  ]);

  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'about':
        return <AboutUser user={user} />;
      case 'events':
        return <UserEvents user={user} />;
      case 'friends':
        return <UserFriends user={user} />;
      default:
        return null;
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <TabView
        lazy
        lazyPreloadDistance={0}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        commonOptions={{ labelStyle: { fontSize: 16, fontWeight: 'bold' } }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: themeColors.text, height: 2 }}
            style={{ backgroundColor: themeColors.background, borderBottomWidth: 0.5, borderBottomColor: themeColors.placeholderTextColor }}
            activeColor={themeColors.text}
            inactiveColor={themeColors.inputBackgroundColor}
            pressColor="transparent"
          />
        )}
      />
    </ThemedView>
  );
}