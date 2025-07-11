import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ContextMenu } from '@expo/ui/swift-ui';
import { Button } from '@expo/ui/swift-ui';
import { useViewEventModal } from '@/context/ViewEventModalContext';

type Props = {
  onDelete: () => void;
};

const PastEventHostActionButton: React.FC<Props> = ({ onDelete }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { showModal } = useViewEventModal();

  const showDeleteConfirmation = () => {
    showModal('host_cancel_confirm', {
      onConfirm: onDelete,
      message: 'Are you sure you want to delete this past event? This action cannot be undone.'
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
          systemImage={"trash"}
          color={themeColors.specialRed}
          children='Delete Event'
          role='destructive'
          onPress={showDeleteConfirmation}
        />
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

export default PastEventHostActionButton; 