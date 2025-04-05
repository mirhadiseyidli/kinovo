import React, { useState, useRef, useEffect } from 'react';
import { Modal, TouchableOpacity, TouchableWithoutFeedback, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface DropdownProps {
  options: string[];
  selected: string;
  onChange: (option: string) => void;
  // Optional styling props that can be passed from the parent
  buttonStyle?: object;
  buttonTextStyle?: object;
  dropdownStyle?: object;
  optionStyle?: object;
  optionTextStyle?: object;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  selected,
  onChange,
  buttonStyle = {},
  buttonTextStyle = {},
  dropdownStyle = {},
  optionStyle = {},
  optionTextStyle = {},
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const buttonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setButtonLayout({ x, y, width, height });
      });
    }
  }, [dropdownOpen]);

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={() => setDropdownOpen(!dropdownOpen)}
        style={[
          {
            backgroundColor: themeColors.inputBackgroundColor,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            width: 120,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          },
          buttonStyle,
        ]}
      >
        <ThemedText style={[{ fontSize: 16, fontWeight: '600', marginRight: 4 }, buttonTextStyle]}>
          {selected}
        </ThemedText>
        <Feather name="chevron-down" size={16} color={themeColors.text} />
      </TouchableOpacity>
      {dropdownOpen && (
        <Modal
          transparent={true}
          visible={dropdownOpen}
          animationType="none"
        >
          {/* Full-screen overlay; tapping it will close the dropdown */}
          <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View
            style={[
              {
                position: 'relative',
                top: buttonLayout.y + buttonLayout.height + 8,
                left: buttonLayout.x,
                width: 160,
                borderRadius: 8,
                zIndex: 1000,
                backgroundColor: themeColors.background,
                overflow: 'hidden'
              },
              dropdownStyle,
            ]}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  setDropdownOpen(false);
                  onChange(option);
                }}
                style={[
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    backgroundColor: selected === option ? themeColors.mountainGreen : themeColors.inputBackgroundColor, // default mountain green (#32CD32) for selected option
                    borderBottomWidth: index !== options.length - 1 ? 1 : 0,
                    borderBottomColor: themeColors.background,
                  },
                  optionStyle,
                ]}
              >
                <ThemedText style={[{ fontWeight: '600' }, optionTextStyle]}>
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      )}
    </>
  );
};

export default Dropdown;