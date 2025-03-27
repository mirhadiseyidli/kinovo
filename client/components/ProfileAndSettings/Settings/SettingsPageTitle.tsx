import React from 'react';
import { View, TextInput, Dimensions } from "react-native";
import { ThemedText } from '../../ThemedText';
import { SettingsPageHeaderProps } from '@/types/allTypes';

const SettingsPageTitle = ({ label }: SettingsPageHeaderProps) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{label}</ThemedText>
    </View>
  );
};

export default SettingsPageTitle;