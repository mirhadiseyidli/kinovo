import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CategoryProps } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useCategories } from '@/hooks/useCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { truncateName } from '@/utils/truncateName';
import CategoryPickerModal from './CategoryPickerModal';

const Category: React.FC<CategoryProps> = React.memo(({ onCategorySelect }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { category, settingEventCategory } = useCreateEventContext();
  // Category chosen and saved (committed)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);
  const { categories, fetchCategories, loading } = useCategories();

  // Logic now handled inside CategoryPickerModal

  // Check for a category in AsyncStorage and context
  useEffect(() => {
    const checkForSelectedCategory = async () => {
      try {
        // First check AsyncStorage for a pre-selected category
        const storedCategory = await AsyncStorage.getItem('selectedCategory');

        
        if (storedCategory) {
          // Apply the stored category
          setSelectedCategory(storedCategory);
          onCategorySelect(storedCategory);
          settingEventCategory(storedCategory);
          
          // Clear the AsyncStorage value to prevent it from being used again
          await AsyncStorage.removeItem('selectedCategory');
        } else if (category) {
          // If no stored category, use the one from context if available
          setSelectedCategory(category);
          onCategorySelect(category);
        }
      } catch (error) {

      }
    };
    
    checkForSelectedCategory();
  }, [category, onCategorySelect, settingEventCategory]);

  const closeModal = useCallback(() => {
    setShowPicker(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategorySelect = (category: string) => {
    // Treat empty selection as no category chosen
    const value = category === '' ? undefined : category;
    setSelectedCategory(value);
    onCategorySelect(value ?? '');
    settingEventCategory(value ?? '');
  };

  const openCategoryOptions = () => {
    if (Platform.OS === 'ios') {
      setShowPicker(true);
    } else {
      Alert.alert('Select Category', '', [
        ...categories.map((category) => ({
          text: category.name,
          onPress: () => handleCategorySelect(category.name),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
      <ThemedView
        style={{
          paddingHorizontal: 16,
          width: '100%',
          borderRadius: 8,
          backgroundColor: themeColors.inputBackgroundColor,
          height: 44,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name="tag"
              size={20}
              color={themeColors.placeholderTextColor}
              style={{ marginRight: 8 }}
            />
            <TouchableOpacity 
              onPress={openCategoryOptions}
              disabled={loading}
              style={{
                paddingVertical: 10,
                width: '100%',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (loading || !selectedCategory) ? 0.4 : 1
              }}
            >
              <ThemedText style={{ fontSize: 16, color: themeColors.text, alignSelf: 'flex-start' }}>
                {loading ? 'Loading categories...' : truncateName(selectedCategory || 'Select Category', 16)}
              </ThemedText>
            </TouchableOpacity>
            {/* <ThemedText
              style={{
                fontSize: 16,
                color: themeColors.placeholderTextColor,
              }}
            >
              {loading ? 'Loading categories...' : 'Select Category'}
            </ThemedText> */}
          </View>
          {/* <TouchableOpacity 
            onPress={openCategoryOptions}
            disabled={loading}
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.5 : 1
            }}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>
              {truncateName(selectedCategory || 'Select', 16)}
            </ThemedText>
          </TouchableOpacity> */}
        </View>
      </ThemedView>

      {Platform.OS === 'ios' && (
        <CategoryPickerModal
          visible={showPicker}
          onClose={closeModal}
          categories={categories}
          selectedValue={selectedCategory}
          onValueChange={handleCategorySelect}
          themeColors={themeColors}
          loading={loading}
        />
      )}
    </>
  );
});

export default Category;