import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Modal, Alert, Platform, Pressable, Dimensions, TextInput, KeyboardAvoidingView } from 'react-native';
import Animated, { 
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  cancelAnimation
} from 'react-native-reanimated';
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
import { truncateName } from '@/utils/truncateName';

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
  // Category chosen and saved (committed)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  // Temporary category used inside the modal before pressing "Done"
  const [tempCategory, setTempCategory] = useState<string | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { categories, fetchCategories, loading } = useCategories();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const mountedRef = useRef(true);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select first match inside the modal only
  useEffect(() => {
    if (showPicker && searchQuery.trim() && filteredCategories.length === 1) {
      setTempCategory(filteredCategories[0].name);
    }
  }, [searchQuery, filteredCategories, showPicker]);

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
    setSearchQuery(''); // Clear search when closing
    setTempCategory(undefined); // Reset temp selection
  }, []);

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
    // Treat empty selection as no category chosen
    const value = category === '' ? undefined : category;
    setSelectedCategory(value);
    onCategorySelect(value ?? '');
    settingEventCategory(value ?? '');
  };

  const openCategoryOptions = () => {
    if (Platform.OS === 'ios') {
      setTempCategory(selectedCategory); // initialise modal selection
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
              {truncateName(selectedCategory || 'Select', 16)}
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
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ maxHeight: SCREEN_HEIGHT * 0.8 }}
            >
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
                        handleCategorySelect(tempCategory ?? '');
                        closeModal();
                      }}
                    >
                      <ThemedText style={{ fontSize: 16, fontWeight: '600', color: themeColors.mountainGreen }}>Done</ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Search Bar */}
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
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
                        blurOnSubmit={true}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                          <Feather name="x" size={16} color={themeColors.placeholderTextColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Picker or No Results */}
                  <View style={{ minHeight: 200 }}>
                    {filteredCategories.length > 0 ? (
                      <Picker
                        selectedValue={tempCategory}
                        onValueChange={(itemValue) => setTempCategory(itemValue)}
                        style={{
                          backgroundColor: themeColors.background,
                          color: themeColors.text,
                        }}
                      >
                        <Picker.Item label="Select a category" value="" />
                        {filteredCategories.map((category) => (
                          <Picker.Item
                            key={category._id}
                            label={category.name}
                            value={category.name}
                          />
                        ))}
                      </Picker>
                    ) : (
                      <View style={{ 
                        paddingVertical: 40, 
                        paddingHorizontal: 16, 
                        alignItems: 'center' 
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
                </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </>
  );
});

export default Category;