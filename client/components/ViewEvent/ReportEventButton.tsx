import type { ReportEventButtonProps, Coordinates, EventProp } from '@/types/allTypes';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

const ReportEventButton = React.memo(({ onPress, themeColors }: ReportEventButtonProps) => {
  const buttonStyle: ViewStyle = useMemo((): ViewStyle => ({
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center'
  }), []);

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}>
      <Feather name="alert-octagon" size={24} color={themeColors.specialRed} />
      <Text style={{ color: themeColors.specialRed, fontSize: 16, fontWeight: '600' }}>Report Event</Text>
    </TouchableOpacity>
  );
});

export default ReportEventButton;