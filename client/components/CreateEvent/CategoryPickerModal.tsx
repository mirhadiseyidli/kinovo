import React, { useState, useEffect } from 'react';
import { TouchableOpacity, TextInput, View, Keyboard } from 'react-native';
import Animated, { useAnimatedStyle, useAnimatedKeyboard } from 'react-native-reanimated';
import { Picker } from '@expo/ui/swift-ui';
import { Portal } from 'react-native-portalize';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

interface Category {
  _id: string;
  name: string;
}

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedValue: string | undefined;
  onValueChange: (value: string) => void;
  themeColors: any;
  loading?: boolean;
}

const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  onClose,
  categories,
  selectedValue,
  onValueChange,
  themeColors,
  loading = false
}) => {
  const [tempCategory, setTempCategory] = useState<string | undefined>(selectedValue);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Keyboard animation
  const keyboard = useAnimatedKeyboard();
  
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: -keyboard.height.value },
      ],
    };
  });

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset temp selection when modal opens
  useEffect(() => {
    if (visible) {
      setTempCategory(selectedValue);
      setSearchQuery('');
    }
  }, [visible, selectedValue]);

  // Auto-select first match when searching
  useEffect(() => {
    if (visible && searchQuery.trim() && filteredCategories.length === 1) {
      setTempCategory(filteredCategories[0].name);
    }
  }, [searchQuery, filteredCategories, visible]);

  const handleDone = () => {
    Keyboard.dismiss();
    onValueChange(tempCategory ?? '');
    onClose();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setTempCategory(undefined);
    onClose();
  };

  const handlePickerSelection = ({ nativeEvent: { index } }: { nativeEvent: { index: number } }) => {
    if (index === 0) {
      setTempCategory(undefined); // "Select a category" option
    } else {
      const selectedCategory = filteredCategories[index - 1]; // -1 because first item is "Select a category"
      setTempCategory(selectedCategory.name);
    }
  };

  // Create options array for Expo UI picker
  const pickerOptions = ['Select a category', ...filteredCategories.map(cat => cat.name)];
  const selectedIndex = tempCategory ? pickerOptions.indexOf(tempCategory) : 0;

  return (
    <Portal>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          justifyContent: 'flex-end',
          opacity: visible ? 1 : 0,
          transitionProperty: ['opacity'],
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            handleCancel();
          }}
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
          style={[
            {
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingVertical: 16,
              maxHeight: '80%',
              transform: [{ translateY: visible ? 0 : 300 }],
              transitionProperty: ['transform'],
              transitionDuration: '200ms',
              transitionTimingFunction: 'ease-in-out',
              zIndex: 2,
            },
            animatedStyles
          ]}
        >
          {/* Handle */}
          <View style={{ 
            width: 36, 
            height: 5, 
            backgroundColor: themeColors.border, 
            borderRadius: 3, 
            alignSelf: 'center', 
            marginBottom: 16 
          }} />

          {/* Title */}
          <View style={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 16,
          }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
              Select Category
            </ThemedText>
          </View>
          
          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeColors.inputBackgroundColor,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
              <Feather name="search" size={16} color={themeColors.placeholderTextColor} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search categories..."
                placeholderTextColor={themeColors.placeholderTextColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: themeColors.text,
                }}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Feather name="x" size={16} color={themeColors.placeholderTextColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Picker or No Results */}
          <View style={{ height: 220, paddingHorizontal: 16 }}>
            {loading ? (
              <View style={{ 
                paddingVertical: 40, 
                paddingHorizontal: 16, 
                alignItems: 'center',
                height: 220
              }}>
                <ThemedText style={{ 
                  color: themeColors.placeholderTextColor, 
                  fontSize: 16 
                }}>
                  Loading categories...
                </ThemedText>
              </View>
            ) : filteredCategories.length > 0 ? (
                <Picker
                  options={pickerOptions}
                  selectedIndex={selectedIndex}
                  onOptionSelected={handlePickerSelection}
                  color={themeColors.mountainGreen}
                  variant="wheel"
                  style={{
                    height: 220,
                  }}
                />
            ) : (
              <View style={{ 
                paddingVertical: 40, 
                paddingHorizontal: 16, 
                alignItems: 'center',
                height: 200
              }}>
                <ThemedText style={{ 
                  color: themeColors.placeholderTextColor, 
                  fontSize: 16 
                }}>
                  No categories found
                </ThemedText>
              </View>
            )}
          </View>

          {/* Bottom Buttons */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            paddingHorizontal: 16, 
            paddingBottom: 16
          }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                padding: 12,
                backgroundColor: themeColors.cardColorsGradientOne,
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDone}
              style={{
                padding: 12,
                backgroundColor: themeColors.mountainGreen,
                borderRadius: 8,
                flex: 1,
                marginLeft: 8,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

export default CategoryPickerModal;