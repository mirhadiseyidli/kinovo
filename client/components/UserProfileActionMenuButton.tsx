import React from 'react';
import { TouchableOpacity, View, Modal, TouchableWithoutFeedback } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { UserProfileActionMenuButtonProps } from '@/types/allTypes';

const UserProfileActionMenuButton = ({
  showOptions,
  setShowOptions,
  onReportUser,
  onBlockUser,
  top,
  right
}: UserProfileActionMenuButtonProps) => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const posTop = top ?? insets.top + 4;
  const posRight = right ?? 16;

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowOptions(!showOptions)}
        style={{ 
          position: 'absolute', 
          top: posTop, 
          right: posRight, 
          backgroundColor: showOptions ? themeColors.inputBackgroundColor : themeColors.buttonBackgroundColor,
          padding: 8, 
          borderRadius: 8,
          zIndex: 10 
        }}
      >
        <Feather name="more-horizontal" size={24} color={themeColors.text} />
      </TouchableOpacity>
      <Modal
        visible={showOptions}
        animationType="fade"
        transparent
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptions(false)}>
          <View style={{ flex: 1 }}>
            <View style={{
              position: 'absolute',
              top: posTop + 44,
              right: posRight,
              borderRadius: 8,
              backgroundColor: themeColors.background,
              zIndex: 20
            }}>
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  gap: 4,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={() => {
                  setShowOptions(false);
                  onReportUser();
                }}
              >
                <Feather name="flag" size={16} color={'red'} />
                <ThemedText style={{ color: 'red', marginLeft: 4 }}>Report User</ThemedText>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: themeColors.placeholderTextColor, alignSelf: 'stretch' }} />
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  gap: 4,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={() => {
                  setShowOptions(false);
                  onBlockUser();
                }}
              >
                <Feather name="slash" size={16} color={themeColors.text} />
                <ThemedText style={{ color: themeColors.text, marginLeft: 4 }}>Block User</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default UserProfileActionMenuButton;