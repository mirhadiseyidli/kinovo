import React from 'react';
import { View } from 'react-native';
import { ContextMenu, Button } from '@expo/ui/swift-ui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export default function ProfilePreviewMenu() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { userId } = useAuthSession();

  const handlePreviewProfile = () => {
    if (userId) {
      router.push(`/(auth)/(profile)/${userId}`);
    }
  };

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
          systemImage={"eye"} 
          onPress={handlePreviewProfile}
          children='Preview Profile'
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