import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Modal, Alert, Platform, Pressable, Dimensions } from 'react-native';
import Animated, { 
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedGestureHandler,
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CategoryProps } from '@/types/allTypes';
import { useCreateEventContext } from '@/context/CreateEventContext';
import { useCategories } from '@/hooks/useCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SPRING_CONFIG = {
  damping: 80,
  mass: 1,
  stiffness: 400
};

const Category: React.FC<CategoryProps> = React.memo(({ onCategorySelect }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { category, settingEventCategory } = useCreateEventContext();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);
  const { categories, fetchCategories, loading } = useCategories();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const mountedRef = useRef(true);

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

  useEffect(() => {
    if (showPicker && mountedRef.current) {
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = SCREEN_HEIGHT;
    }
  }, [showPicker]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelAnimation(translateY);
    };
  }, []);

  const closeModal = useCallback(() => {
    setShowPicker(false);
  }, []);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      if (!mountedRef.current) return; // Don't update if unmounted
      const newValue = ctx.startY + event.translationY;
      if (newValue > 0) { // Only allow downward drag
        translateY.value = newValue;
      }
    },
    onEnd: (event) => {
      if (!mountedRef.current) return; // Don't update if unmounted
      if (event.velocityY > 500 || event.translationY > 100) {
        translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        runOnJS(closeModal)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    },
  });

  // Memoize animated style to prevent recreation on every render
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  }, [translateY]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    onCategorySelect(category);
    settingEventCategory(category);
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
            <ThemedText
              style={{
                fontSize: 16,
                color: themeColors.placeholderTextColor,
              }}
            >
              {loading ? 'Loading categories...' : 'Select Category'}
            </ThemedText>
          </View>
          <TouchableOpacity 
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
              {selectedCategory ?? 'Select'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {Platform.OS === 'ios' && (
        <Modal
          animationType="none"
          transparent={true}
          visible={showPicker}
          onRequestClose={closeModal}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={closeModal}
              />
            </Animated.View>
            <PanGestureHandler onGestureEvent={gestureHandler}>
              <Animated.View
                style={[{
                  backgroundColor: themeColors.background,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  overflow: 'hidden',
                  width: '100%',
                  paddingVertical: 16,
                }, animatedStyle]}
              >
                <View style={{ width: 36, height: 5, backgroundColor: themeColors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.border,
                  }}
                >
                  <TouchableOpacity onPress={closeModal} style={{ paddingVertical: 4 }}>
                    <ThemedText style={{ fontSize: 16 }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedCategory) {
                        handleCategorySelect(selectedCategory);
                      }
                      closeModal();
                    }}
                  >
                    <ThemedText style={{ fontSize: 16, fontWeight: '600', color: themeColors.mountainGreen }}>Done</ThemedText>
                  </TouchableOpacity>
                </View>
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                  style={{
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                >
                  <Picker.Item label="Select a category" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category._id}
                      label={category.name}
                      value={category.name}
                    />
                  ))}
                </Picker>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Modal>
      )}
    </>
  );
});

export default Category;