import React from 'react';
import { View, Text } from 'react-native';
import NotificationsButton from '@/components/NotificationsButton';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/context/UserSessionContext';

const Header: React.FC<{ refreshing?: boolean }> = React.memo(({ refreshing }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { unseenNotificationCount } = useNotifications();

  return (
    <ThemedView 
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
      }}
    >
      <ThemedText style={{ fontSize: 28, fontFamily: 'Helvetica Neue Bold', fontWeight: 'bold', letterSpacing: -1 }}>Kinovo</ThemedText>

      {/* Right - Notifications Button */}
      <ThemedView style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <NotificationsButton refreshing={refreshing} count={unseenNotificationCount} />
      </ThemedView>
    </ThemedView>
  );
});

Header.displayName = 'Header';

export default Header;