import React from 'react';
import { View, Text } from 'react-native';
import SearchButton from '@/components/SearchBar';
import NotificationsButton from '@/components/NotificationsButton';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const Header: React.FC = () => {
  return (
    <ThemedView 
      className="flex-1 flex-row justify-between items-center px-4 h-16"
    >
      {/* Left */}
      <ThemedText className='text-2xl'>LOGO HERE</ThemedText>

      {/* Right - Notifications Button */}
      <ThemedView className="flex-row gap-[10] items-center">
        <NotificationsButton count={3} />
      </ThemedView>
    </ThemedView>
  );
};

export default Header;