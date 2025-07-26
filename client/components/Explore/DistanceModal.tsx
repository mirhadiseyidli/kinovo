import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Modal, Animated } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DistanceModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDistance: number;
  onSelectDistance: (distance: number) => void;
  colorScheme: 'light' | 'dark';
}

const DistanceModal: React.FC<DistanceModalProps> = ({ 
  visible, 
  onClose, 
  selectedDistance, 
  onSelectDistance, 
  colorScheme 
}) => {
  const insets = useSafeAreaInsets();
  const themeColors = Colors[colorScheme];
  const [tempDistance, setTempDistance] = useState(selectedDistance);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Handle modal animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
            }}
          >
            <ThemedView style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: insets.bottom,
            }}>
              {/* Drag handle indicator */}
              <View style={{
                alignSelf: 'center',
                width: 50,
                height: 5,
                backgroundColor: themeColors.placeholderTextColor,
                borderRadius: 3,
                marginTop: 8,
                marginBottom: 8,
                opacity: 0.7,
              }} />

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.border,
              }}>
                <TouchableOpacity onPress={onClose}>
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Distance</ThemedText>
                <TouchableOpacity onPress={() => {
                  onSelectDistance(tempDistance);
                  onClose();
                }}>
                  <ThemedText style={{ color: themeColors.mountainGreen }}>Apply</ThemedText>
                </TouchableOpacity>
              </View>

              <Picker
                selectedValue={tempDistance}
                onValueChange={setTempDistance}
                style={{ 
                  width: '100%',
                  backgroundColor: themeColors.background,
                }}
              >
                {[10, 25, 50, 100, 150, 200].map((distance) => (
                  <Picker.Item 
                    key={distance} 
                    label={`${distance} miles`} 
                    value={distance}
                    color={themeColors.text}
                  />
                ))}
              </Picker>
            </ThemedView>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default DistanceModal;