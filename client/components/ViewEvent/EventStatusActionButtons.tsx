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
  onAccept: () => void;
  onMaybe: () => void;
  onDecline: () => void;
  onInvite: () => void;
  onEdit: () => void;
  onCancel: () => void;
  isCreator: boolean;
  loading?: boolean;
  isInvited?: boolean;
};

const EventStatusActionButtons: React.FC<Props> = ({ 
  currentUserStatus, 
  onAccept, 
  onMaybe, 
  onDecline, 
  onInvite, 
  onEdit, 
  onCancel, 
  isCreator,
  loading = false,
  isInvited = true
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={onAccept}
        disabled={loading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'accepted' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Feather name="check" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>
          {isInvited ? 'Accept' : 'Join'}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMaybe}
        disabled={loading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'maybe' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <MaterialIcons name="question-mark" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>Maybe</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDecline}
        disabled={loading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentUserStatus === 'rejected' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Feather name="x" size={12} color={themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>
          {isInvited ? 'Decline' : 'Not Interested'}
        </ThemedText>
      </TouchableOpacity>
      
      {isCreator &&
        <EventHostActionButtons onEdit={onEdit} onInvite={onInvite} onCancel={onCancel}/>
      }
    </View>
  );
};

export default React.memo(EventStatusActionButtons);
