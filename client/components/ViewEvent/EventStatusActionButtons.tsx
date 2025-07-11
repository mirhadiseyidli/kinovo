import React, { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActionSheetIOS, Platform, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '../ThemedText';
import EventHostActionButtons from './EventHostActionButtons';
import PastEventHostActionButton from './PastEventHostActionButton';
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
  isEventInPast?: boolean;
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
  isInvited = true,
  isEventInPast = false
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  // Local state to track button status for immediate UI updates
  const [localUserStatus, setLocalUserStatus] = useState<'pending' | 'maybe' | 'accepted' | 'rejected' | null>(currentUserStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Update local state when props change
  useEffect(() => {
    setLocalUserStatus(currentUserStatus);
  }, [currentUserStatus]);
  
  // Handler for Accept button
  const handleAccept = useCallback(() => {
    setIsUpdating(true);
    setLocalUserStatus('accepted');
    onAccept();
    setIsUpdating(false);
  }, [onAccept]);
  
  // Handler for Maybe button
  const handleMaybe = useCallback(() => {
    setIsUpdating(true);
    setLocalUserStatus('maybe');
    onMaybe();
    setIsUpdating(false);
  }, [onMaybe]);
  
  // Handler for Decline button
  const handleDecline = useCallback(() => {
    setIsUpdating(true);
    setLocalUserStatus('rejected');
    onDecline();
    setIsUpdating(false);
  }, [onDecline]);

  // For past events, show only the user's response
  if (isEventInPast) {
    const getResponseButton = () => {
      switch (localUserStatus) {
        case 'accepted':
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.inputBackgroundColor, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1, justifyContent: 'center' }}>
              <Feather name="check" size={12} color="white" style={{ marginRight: 4 }} />
              <ThemedText style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Attended</ThemedText>
            </View>
          );
        case 'maybe':
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.inputBackgroundColor, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1, justifyContent: 'center'  }}>
              <MaterialIcons name="question-mark" size={12} color="white" style={{ marginRight: 4 }} />
              <ThemedText style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Maybe</ThemedText>
            </View>
          );
        case 'rejected':
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.inputBackgroundColor, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1, justifyContent: 'center'  }}>
              <Feather name="x" size={12} color="white" style={{ marginRight: 4 }} />
              <ThemedText style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Did Not Attend</ThemedText>
            </View>
          );
        default:
          return null;
      }
    };

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        {getResponseButton()}
        {isCreator && <PastEventHostActionButton onDelete={onCancel} />}
      </View>
    );
  }

  // Regular event view
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={handleAccept}
        disabled={loading || isUpdating}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: localUserStatus === 'accepted' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: (loading || isUpdating) ? 0.6 : 1,
        }}
      >
        <Feather name="check" size={12} color={localUserStatus === 'accepted' ? 'white' : themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600', color: localUserStatus === 'accepted' ? 'white' : themeColors.text }}>
          {isInvited ? 'Accept' : 'Join'}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleMaybe}
        disabled={loading || isUpdating}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: localUserStatus === 'maybe' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: (loading || isUpdating) ? 0.6 : 1,
        }}
      >
        <MaterialIcons name="question-mark" size={12} color={localUserStatus === 'maybe' ? 'white' : themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600', color: localUserStatus === 'maybe' ? 'white' : themeColors.text }}>Maybe</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDecline}
        disabled={loading || isUpdating}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: localUserStatus === 'rejected' ? themeColors.mountainGreen : themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: (loading || isUpdating) ? 0.6 : 1,
        }}
      >
        <Feather name="x" size={12} color={localUserStatus === 'rejected' ? 'white' : themeColors.text} style={{ marginRight: 4 }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '600', color: localUserStatus === 'rejected' ? 'white' : themeColors.text }}>
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
