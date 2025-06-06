import React from 'react';
import { View } from 'react-native';
import { ContextMenu, Button } from '@expo/ui/swift-ui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ContextMenuWithTriggerProps {
  onRemove: () => void;
  onBlock: () => void;
}

export default function ContextMenuWithTrigger({ onRemove, onBlock }: ContextMenuWithTriggerProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ContextMenu 
      activationMethod='singlePress'
      style={{ 
        height: 34,
        width: 40,
        alignItems: 'center',
      }}
    >
      <ContextMenu.Items>
        <Button 
          systemImage={"person.badge.minus"} 
          onPress={onRemove}
          children='Remove Friend'
          role='destructive'
        />
        <Button 
          systemImage={"exclamationmark.triangle"} 
          onPress={onBlock}
          children='Block User'
          role='destructive'
        />
      </ContextMenu.Items>

      <ContextMenu.Trigger>
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 8,
          width: 40,
          alignItems: 'center',
        }}>
          <Feather name="more-horizontal" size={24} color={themeColors.text} />
        </View>
      </ContextMenu.Trigger>
    </ContextMenu>
  );
} 