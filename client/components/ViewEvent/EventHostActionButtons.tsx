import React from 'react';
import { View, ActionSheetIOS } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ContextMenu, Submenu } from '@expo/ui/swift-ui';
import { Button } from '@expo/ui/swift-ui';
import { useViewEventModal } from '../../app/(auth)/viewEvent/[event_id]';

type Props = {
  onInvite?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
};

const EventHostActionButtons: React.FC<Props> = ({ onInvite, onEdit, onCancel }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { showModal } = useViewEventModal();

  const showCancelConfirmation = () => {
    showModal('host_cancel_confirm', {
      onConfirm: onCancel
    });
  };

  return (
    <ContextMenu 
      activationMethod='singlePress'
      style={{ 
        height: 34,
        width: 32,
      }}
    >
      <ContextMenu.Items>
        <Button 
          systemImage={"person.badge.plus"} 
          onPress={onInvite}
          children='Add Attendees'
        />
        <Button 
          systemImage={"square.and.pencil"} 
          onPress={onEdit}
          children='Edit Event'
        />
        <Button
          systemImage={"xmark.octagon" }
          color={themeColors.specialRed}
          children='Cancel Event'
          role='destructive'
          onPress={showCancelConfirmation}/>
      </ContextMenu.Items>

      <ContextMenu.Trigger>
        <Button
          style={{
            paddingHorizontal: 8,
            paddingVertical: 10,
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
          }}
          color={themeColors.text}
          children='⋮'
        />
      </ContextMenu.Trigger>
    </ContextMenu>
  );
};

export default EventHostActionButtons;
