import React from 'react';
import { View, Text } from 'react-native';
import NotificationsButton from '@/components/NotificationsButton';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const Header: React.FC = () => {
  return (
    <ThemedView 
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 64,
      }}
    >
      {/* Left */}
      <ThemedText style={{ fontSize: 32, fontFamily: 'Didot', fontWeight: 'bold' }}>Kinovo</ThemedText>

      {/* Right - Notifications Button */}
      <ThemedView style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <NotificationsButton count={3} />
      </ThemedView>
    </ThemedView>
  );
};

export default Header;