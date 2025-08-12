import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Picker } from '@expo/ui/swift-ui';
import { Portal } from 'react-native-portalize';

interface PickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedValue: string;
  onValueChange: (value: string) => void;
  themeColors: any;
  options: string[];
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  onClose,
  selectedValue,
  onValueChange,
  themeColors,
  options
}) => {
  const handleSelection = (selectedIndex: number) => {
    const selectedOption = options[selectedIndex];
    onValueChange(selectedOption);
  };

  return (
    <Portal>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 999,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: visible ? 1 : 0,
          transitionProperty: ['opacity'],
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={1}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        />

        <Animated.View
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            transform: [{ scale: visible ? 1 : 0.9 }],
            transitionProperty: ['transform'],
            transitionDuration: '300ms',
            transitionTimingFunction: 'ease-in-out',
            zIndex: 2,
          }}
        >
          <Picker
            options={options}
            selectedIndex={options.indexOf(selectedValue)}
            onOptionSelected={({ nativeEvent: { index } }) => {
              handleSelection(index);
            }}
            color={themeColors.mountainGreen}
            variant="wheel"
            style={{ height: 130 }}
          />
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

export default PickerModal;