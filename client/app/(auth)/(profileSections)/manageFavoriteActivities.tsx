import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, Dimensions, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router, Stack, useNavigation } from 'expo-router';
import { useFavoriteActivities } from '@/hooks/useFavoriteActivities';
import { Picker } from '@react-native-picker/picker';
import { useCategories, type Category } from '@/hooks/useCategories';
import type { Activity } from '@/constants/Activities';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { SkeletonBox } from '@/components/Skeleton';

const ManageFavoriteActivities = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const navigation = useNavigation();
  const { loading, activities, fetchActivities, addActivity, removeActivity } = useFavoriteActivities();
  const { categories, fetchCategories, loading: categoriesLoading } = useCategories();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Category | undefined>(undefined);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Memoized header button
  const headerRightButton = useMemo(() => (
    <TouchableOpacity
      onPress={() => setShowPicker(true)}
    >
      <IconSymbol name="plus.circle" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), [themeColors.text]);

  // Set up header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => headerRightButton,
    });
  }, [navigation, headerRightButton]);


  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          fetchActivities(),
          fetchCategories()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsFirstFetch(false);
      }
    };
  
    load();
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
    if (showPicker && searchQuery.trim() && filteredCategories.length === 1) {
      setSelectedActivity(filteredCategories[0]);
      setSelectedActivityId(filteredCategories[0]._id);
    }
  }, [searchQuery, filteredCategories, showPicker]);

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      setIsFirstFetch(false);
      await Promise.all([
        fetchActivities(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchActivities, fetchCategories]);

  const handleAddActivity = async () => {
    if (selectedActivity && await addActivity(selectedActivity.name as Activity)) {
      setShowPicker(false);
      setSearchQuery(''); // Clear search when closing
    }
  };

  const closeModal = () => {
    setShowPicker(false);
    setSearchQuery(''); // Clear search when closing
  };

  const handleRemoveActivity = async (activity: Activity) => {
    Alert.alert(
      'Remove Activity',
      `Are you sure you want to remove ${activity} from your favorite activities?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeActivity(activity);
          }
        }
      ]
    );
  };

  if (isFirstFetch) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', padding: 16, gap: 16 }}>
        <SkeletonBox width={'100%'} height={60} borderRadius={16}/>
        <SkeletonBox width={'100%'} height={60} borderRadius={16}/>
        <SkeletonBox width={'100%'} height={60} borderRadius={16}/>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
      >
        {activities.length > 0 ? (
          activities.map((activity: Activity, index) => {
            const iconName = getCategoryIcon(activity);
            const iconColor = getCategoryColor(activity);
            
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleRemoveActivity(activity)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: themeColors.background,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                  <ThemedText style={{ fontSize: 16 }}>{activity}</ThemedText>
                </View>
                <Feather name="x" size={20} color={themeColors.placeholderTextColor} />
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={{
            backgroundColor: themeColors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: themeColors.border,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}>
            <View style={{ marginBottom: 12 }}>
              <Feather
                name="activity"
                size={32}
                color={themeColors.placeholderTextColor}
              />
            </View>
            <ThemedText 
              style={{ 
                fontSize: 16, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                marginBottom: 4,
                fontWeight: '600'
              }}
            >
              No favorite activities yet
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              Tap the plus button to add your favorite activities!
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showPicker}
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
                    Add Activity
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
                    onPress={handleAddActivity}
                    style={{
                      padding: 12,
                      backgroundColor: themeColors.mountainGreen,
                      borderRadius: 8,
                      flex: 1,
                      marginLeft: 8,
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Add</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

export default ManageFavoriteActivities; 