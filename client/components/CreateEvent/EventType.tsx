import React, { useState } from 'react';
import { View, TouchableOpacity, Dimensions, ActionSheetIOS, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const categoryOptions = ['Soccer', 'Hiking', 'Volleyball', 'Cycling', 'Running', 'Cancel'];

interface CategoryProps {
  onCategorySelect: (category: string) => void;
}

const Category: React.FC<CategoryProps> = ({ onCategorySelect }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // ✅ Function to Open Native Action Sheet for Category Selection
  const openCategoryOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: categoryOptions,
          cancelButtonIndex: categoryOptions.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex !== categoryOptions.length - 1) {
            setSelectedCategory(categoryOptions[buttonIndex]);
            onCategorySelect(categoryOptions[buttonIndex]); // Pass selected category up
          }
        }
      );
    } else {
      Alert.alert('Select Category', '', [
        ...categoryOptions.slice(0, -1).map((category) => ({
          text: category,
          onPress: () => {
            setSelectedCategory(category);
            onCategorySelect(category);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      <ThemedView
        style={{
          paddingVertical: 8,
          paddingHorizontal: 16,
          width: '100%',
          borderRadius: 8,
          backgroundColor: themeColors.inputBackgroundColor,
          elevation: 5,
          height: 52,
        }}
      >
        {/* Category Selection */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name="tag"
              size={24}
              color={themeColors.placeholderTextColor}
              style={{ marginRight: 8 }}
            />
            <ThemedText
              style={{
                fontSize: 16,
                color: themeColors.placeholderTextColor,
              }}
            >
              Select Category
            </ThemedText>
          </View>
          <TouchableOpacity onPress={openCategoryOptions}
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: '400', color: themeColors.text }}>
              {selectedCategory ?? 'Select'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default Category;