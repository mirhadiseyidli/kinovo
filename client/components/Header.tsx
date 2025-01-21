import React from 'react';
import { View, Text } from 'react-native';
import MenuButton from './MenuButton';
import CreateEventButton from './CreateEventButton';
import SearchButton from './SearchButton';
import ProfileButton from './ProfileButton';
import NotificationsButton from './NotificationsButton';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

const Header: React.FC = () => {
  return (
    <ThemedView 
      className="flex-row justify-between items-center px-4 h-16 bg-white"
      // style={{
      //   shadowColor: '#000',
      //   shadowOffset: { width: 0, height: 1 }, // Shadow only on the bottom
      //   shadowOpacity: 0.1,
      //   shadowRadius: 2, // Smooth shadow edges
      //   elevation: 3, // For Android
      // }}
    >
      {/* Left - Menu Button */}
      {/* <MenuButton /> */}
      <ThemedText>LOGO HERE</ThemedText>

      {/* Right - Search and Profile Buttons */}
      <ThemedView className="flex-row gap-[10] items-center">
        <NotificationsButton count={3} />
      </ThemedView>
    </ThemedView>
  );
};

export default Header;