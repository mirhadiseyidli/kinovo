import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Alert, Dimensions, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import api from '@/utils/api';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useCategories, type Category } from '@/hooks/useCategories';

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTagModal({ visible, onClose, onSuccess }: CreateTagModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<Category | undefined>(undefined);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { categories, fetchCategories } = useCategories();

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Set default selected activity when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && selectedActivity === undefined) {
      setSelectedActivity(categories[0]);
      setSelectedActivityId(categories[0]._id);
    }
  }, [categories, selectedActivity]);

  // Auto-select when search results in single match
  useEffect(() => {
    if (visible && searchQuery.trim() && filteredCategories.length === 1) {
      setSelectedActivity(filteredCategories[0]);
      setSelectedActivityId(filteredCategories[0]._id);
    }
  }, [searchQuery, filteredCategories, visible]);

  const handleCreateTag = async () => {
    if (!selectedActivity) return;
    
    setIsLoading(true);
    try {
      await api.post('/api/users/tags', { activity_name: selectedActivity.name });
      onSuccess();
      closeModal();
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    onClose();
    setSearchQuery(''); // Clear search when closing
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={closeModal}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        activeOpacity={1}
        onPress={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ maxHeight: Dimensions.get('window').height * 0.8 }}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedView
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                overflow: 'hidden',
                width: '100%',
                paddingVertical: 16,
              }}
            >
              {/* Drag handle indicator */}
              <View style={{
                alignSelf: 'center',
                width: 50,
                height: 5,
                backgroundColor: themeColors.placeholderTextColor,
                borderRadius: 3,
                marginTop: -5,
                marginBottom: 15,
                opacity: 0.7,
              }} />
              
              <View
                style={{
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                }}
              >
                <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                  Select Activity Tag
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
                    placeholder="Search activities..."
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
              <View style={{ minHeight: 200 }}>
                {filteredCategories.length > 0 ? (
                  <Picker
                    selectedValue={selectedActivityId}
                    onValueChange={(itemValue: string) => {
                      const category = filteredCategories.find(cat => cat._id === itemValue);
                      if (category) {
                        setSelectedActivity(category);
                        setSelectedActivityId(itemValue);
                      }
                    }}
                    style={{
                      color: themeColors.text,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {filteredCategories.map((category: Category) => (
                      <Picker.Item 
                        key={category._id} 
                        label={category.name} 
                        value={category._id}
                        color={themeColors.text}
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
                      No activities found
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 }}>
                <TouchableOpacity
                  onPress={closeModal}
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
                  onPress={handleCreateTag}
                  disabled={isLoading || !selectedActivity}
                  style={{
                    padding: 12,
                    backgroundColor: themeColors.mountainGreen,
                    borderRadius: 8,
                    flex: 1,
                    marginLeft: 8,
                    alignItems: 'center',
                    opacity: (isLoading || !selectedActivity) ? 0.7 : 1,
                  }}
                >
                  <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                    {isLoading ? 'Creating...' : 'Create'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
} 