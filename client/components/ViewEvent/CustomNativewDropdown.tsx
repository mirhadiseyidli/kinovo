import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  Text,
  Modal,
  TouchableWithoutFeedback,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { StyleProp, ViewStyle } from 'react-native';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export type NativeDropdownProps = {
  options?: string[];
  onOptionSelected?: (event: { nativeEvent: { index: number; label: string } }) => void;
  style?: StyleProp<ViewStyle>;
  renderTrigger?: (open: () => void) => React.ReactNode;
};

export function CustomNativeDropdown({
  options,
  onOptionSelected,
  renderTrigger = (open) => (
    <Pressable onPress={open} style={{ padding: 12, backgroundColor: '#eee', borderRadius: 4 }}>
      <Text style={{ fontSize: 16 }}>Select</Text>
    </Pressable>
  ),
}: {
  options: string[];
  onOptionSelected?: (event: { nativeEvent: { index: number; label: string } }) => void;
  renderTrigger?: (open: () => void) => React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const scaleAnim = useSharedValue(0.8);
  const opacityAnim = useSharedValue(0);
  const dropdownWidth = useSharedValue(200);

  const openPicker = () => {
    const handle = findNodeHandle(triggerRef.current);
    if (handle) {
      UIManager.measureInWindow(handle, (x, y, width, height) => {
        setDropdownPos({ x, y: y + height });
        setVisible(true);
      });
    }
  };

  const closePicker = () => {
    scaleAnim.value = withTiming(0.8, { duration: 150 });
    opacityAnim.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(setVisible)(false);
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
    transform: [
      { translateX: -0.5 * dropdownWidth.value },
      { scale: scaleAnim.value },
      { translateX: 0.5 * dropdownWidth.value },
    ],
  }));

  useEffect(() => {
    if (visible) {
      scaleAnim.value = withTiming(1, { duration: 150 });
      opacityAnim.value = withTiming(1, { duration: 150 });
    }
  }, [visible]);

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleSelect = (index: number, label: string) => {
    onOptionSelected?.({ nativeEvent: { index, label } });
    closePicker();
  };

  return (
    <ThemedView>
      <View ref={triggerRef} collapsable={false}>
        {renderTrigger(openPicker)}
      </View>
      <Modal
        transparent
        animationType="none"
        visible={visible}
        onRequestClose={closePicker}
      >
        <TouchableWithoutFeedback onPress={closePicker}>
          <View style={{ flex: 1 }}>
            <Animated.View
              onLayout={e => dropdownWidth.value = e.nativeEvent.layout.width}
              style={[
                {
                  position: 'absolute',
                  top: dropdownPos.y,
                  left: dropdownPos.x,
                  backgroundColor: themeColors.inputBackgroundColor,
                  borderRadius: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                  minWidth: 200,
                },
                animatedStyle,
              ]}
            >
              {options.map((label, index) => (
                <Pressable
                  key={index}
                  style={{
                    padding: 12,
                    borderBottomWidth: index < options.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.background,
                  }}
                  onPress={() => handleSelect(index, label)}
                >
                  <Text style={{ fontSize: 16, color: themeColors.text }}>{label}</Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}