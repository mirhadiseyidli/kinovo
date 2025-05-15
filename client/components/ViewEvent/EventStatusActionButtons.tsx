import React from 'react';
import { View, TouchableOpacity, Text, ActionSheetIOS, Platform, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '../ThemedText';
import EventHostActionButtons from './EventHostActionButtons';
import { Button } from '@expo/ui/swift-ui';

type Props = {
  currentUserStatus: 'pending' | 'maybe' | 'accepted' | 'rejected' | null;
  onInvite: () => void;
  onEdit: () => void;
  onCancel: () => void;
  isCreator: boolean;
};

const EventStatusActionButtons: React.FC<Props> = ({ currentUserStatus, onInvite, onEdit, onCancel, isCreator }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={onInvite}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'accepted' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Feather name="check" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>Accept</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onEdit}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'maybe' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <MaterialIcons name="question-mark" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>Maybe</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onInvite}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'rejected' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Feather name="x" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>Decline</ThemedText>
      </TouchableOpacity>
      
      {isCreator &&
        <EventHostActionButtons />
      }
    </View>
  );
};

export default React.memo(EventStatusActionButtons);
