import React from 'react';
import { View, ActionSheetIOS } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ContextMenu, Submenu } from '@expo/ui/swift-ui';
import { Button } from '@expo/ui/swift-ui';

type Props = {
  onInvite?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
};

const EventHostActionButtons: React.FC<Props> = ({ onInvite, onEdit, onCancel }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

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
        >
          Add Attendees
        </Button>
        <Button 
          systemImage={"square.and.pencil"} 
          onPress={onEdit}
        >
          Edit Event
        </Button>
        <Button
          systemImage={"xmark.octagon" }
          color={themeColors.specialRed}
          onPress={() =>
            ActionSheetIOS.showActionSheetWithOptions(
              {
                title: 'Are you sure you want to cancel the event?',
                options: ['No', 'Yes, Cancel'],
                cancelButtonIndex: 0,
                destructiveButtonIndex: 1,
                userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light',
              },
              (index) => {
                if (index === 1) onCancel?.();
              }
            )
          }>
            Cancel Event
        </Button>
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
        >
          ⋮
        </Button>
      </ContextMenu.Trigger>
    </ContextMenu>
  );
};

export default EventHostActionButtons;
