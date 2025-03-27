import React from 'react';
import { View, Text } from 'react-native';
import NotificationsButton from '@/components/NotificationsButton';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import NavigateBackButton from '@/components/NavigateBackButton';
import SettingsPageTitle from './SettingsPageTitle';
import { SettingsPageHeaderProps } from '@/types/allTypes';

const SettingsPageHeader = ({ label }: SettingsPageHeaderProps) => {
  return (
    <ThemedView 
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        height: 64,
      }}
    >
      {/* Back Button */}
      <NavigateBackButton top={4}/>

      {/* Page Title */}
      <SettingsPageTitle label={label} />
    </ThemedView>
  );
};

export default SettingsPageHeader;