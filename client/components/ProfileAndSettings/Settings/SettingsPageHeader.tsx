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
    <View 
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      {/* Back Button */}
      <NavigateBackButton top={-1}/>

      {/* Page Title */}
      <SettingsPageTitle label={label} />
    </View>
  );
};

export default SettingsPageHeader;