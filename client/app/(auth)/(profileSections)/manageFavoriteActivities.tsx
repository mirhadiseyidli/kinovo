import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router, Stack } from 'expo-router';
import { useFavoriteActivities } from '@/hooks/useFavoriteActivities';
import { Picker } from '@react-native-picker/picker';
import { ACTIVITIES } from '@/constants/Activities';
import type { Activity } from '@/constants/Activities';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';

const ManageFavoriteActivities = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { loading, activities, fetchActivities, addActivity, removeActivity } = useFavoriteActivities();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity>(ACTIVITIES[0]);
  const [refreshing, setRefreshing] = useState(false);

  // Animation for the slide-up effect
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (showPicker) {
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
  }, [showPicker]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  const handleAddActivity = async () => {
    if (await addActivity(selectedActivity)) {
      setShowPicker(false);
    }
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

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.mountainGreen} style={{ marginTop: 32 }}/>
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
        {loading && !refreshing ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>Loading...</ThemedText>
        ) : activities.length > 0 ? (
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
              Tap the plus button to add your favorite activities! 🏃‍♂️
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showPicker}
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
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
              <ThemedView
                style={{
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  minHeight: 300,
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
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    marginHorizontal: -20,
                    paddingHorizontal: 20,
                  }}
                >
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                    Add Activity
                  </ThemedText>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Feather name="x" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                <Picker
                  selectedValue={selectedActivity}
                  onValueChange={(itemValue: Activity) => setSelectedActivity(itemValue)}
                  style={{
                    color: themeColors.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  {ACTIVITIES.map((activity: Activity) => (
                    <Picker.Item 
                      key={activity} 
                      label={activity} 
                      value={activity}
                      color={themeColors.text}
                    />
                  ))}
                </Picker>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <TouchableOpacity
                    onPress={() => setShowPicker(false)}
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
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

export default ManageFavoriteActivities; 