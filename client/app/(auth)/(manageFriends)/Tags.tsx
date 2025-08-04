import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions } from 'react-native';
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import api from '@/utils/api';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import CreateTagModal from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/CreateTagModal';
import ManageTagFriendsModal from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/ManageTagFriendsModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Tag {
  activity_name: string;
  friends: {
    _id: string;
    full_name: string;
    username: string;
    profile_picture?: string;
  }[];
}

interface TagItemProps {
  tag: Tag;
  isExpanded: boolean;
  onTagPress: (activityName: string) => void;
  onManageFriends: (tag: Tag) => void;
  onRemoveFriend: (friendId: string, friendName: string, tagName: string) => void;
  onRefresh: () => void;
  themeColors: any;
}

const useChevronRotation = (isExpanded: boolean) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
  }, [isExpanded]);

  useEffect(() => {
    return () => {
      rotation.value = 0;
    };
  }, []);

  return useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotation.value * 90}deg`,
      },
    ],
  }));
};

const TagItem: React.FC<TagItemProps> = ({
  tag,
  isExpanded,
  onTagPress,
  onManageFriends,
  onRemoveFriend,
  onRefresh,
  themeColors
}) => {
  const width = Dimensions.get('window').width;
  const chevronStyle = useChevronRotation(isExpanded);
  const iconName = getCategoryIcon(tag.activity_name);
  const iconColor = getCategoryColor(tag.activity_name);
  const translateX = useSharedValue(0);
  const deleteWidth = 80; // Width of the delete area
  const deleteExtendedWidth = width * 0.9; // Increased width for full swipe
  const isDeleteVisible = useSharedValue(false);
  const isSwipingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      translateX.value = 0;
      isDeleteVisible.value = false;
    };
  }, []);

  const showDeleteAlert = () => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the ${tag.activity_name} tag?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            translateX.value = withSpring(0);
            isDeleteVisible.value = false;
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/users/tags', {
                data: { activity_name: tag.activity_name }
              });
              onRefresh(); // Refresh the tags list immediately
            } catch (error) {
              console.error('Error deleting tag:', error);
              Alert.alert('Error', 'Failed to delete tag. Please try again.');
              translateX.value = withSpring(0);
              isDeleteVisible.value = false;
            }
          }
        }
      ]
    );
  };

  const markSwipingTrue = () => { 
    'worklet';
    isSwipingRef.current = true; 
  };
  
  const markSwipingFalse = () => { 
    'worklet';
    isSwipingRef.current = false; 
  };

  const triggerTagPress = () => {
    onTagPress(tag.activity_name);
  };

  const panTap = Gesture.Tap()
    .onBegin(() => {
      markSwipingFalse();
    })
    .onEnd(() => {
      // Only trigger tap if we haven't been swiping
      if (!isSwipingRef.current) {
        runOnJS(triggerTagPress)();
      }
    })

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      markSwipingTrue();
    })
    .onUpdate((event) => {
      // Always allow swiping back to the right
      if (event.translationX > 0) {
        const newX = Math.min(0, translateX.value + event.translationX);
        translateX.value = newX;
        if (newX === 0) {
          isDeleteVisible.value = false;
        }
        return;
      }

      if (!isDeleteVisible.value) {
        // Normal swipe to reveal delete button
        const newX = Math.min(0, Math.max(-deleteWidth, event.translationX));
        translateX.value = newX;
      } else {
        // Additional swipe when delete is visible
        const additionalSwipe = Math.min(0, event.translationX);
        const totalSwipe = Math.max(-deleteExtendedWidth, -deleteWidth + additionalSwipe);
        translateX.value = totalSwipe;
      }
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const isSwipedPastThreshold = translateX.value < -deleteWidth * 0.5;
      const isFastSwipe = Math.abs(velocity) > 500;
      
      // Always allow swiping back to start
      if (velocity > 0 && translateX.value > -deleteWidth * 0.3) {
        translateX.value = withSpring(0);
        isDeleteVisible.value = false;
        return;
      }

      if (!isDeleteVisible.value) {
        if (isSwipedPastThreshold || (isFastSwipe && velocity < 0)) {
          translateX.value = withSpring(-deleteWidth);
          isDeleteVisible.value = true;
        } else {
          translateX.value = withSpring(0);
          isDeleteVisible.value = false;
        }
      } else {
        // When delete is visible and user swipes again
        if (translateX.value <= -deleteExtendedWidth || (isFastSwipe && velocity < 0 && translateX.value < -deleteExtendedWidth * 0.9)) {
          runOnJS(showDeleteAlert)();
        }
        translateX.value = withSpring(-deleteWidth);
      }
    })

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTagPress = () => {
    onTagPress(tag.activity_name);
  };

  const deleteAreaStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, -translateX.value / deleteWidth);
    const extendedWidth = deleteWidth + Math.max(0, (-translateX.value - deleteWidth) * 2);
    return {
      width: extendedWidth,
      opacity: progress,
    };
  });

  return (
    <View key={tag.activity_name} style={{ gap: 16 }}>
      <View style={[
        {
          overflow: 'hidden',
          position: 'relative',
        }
      ]}>
        {/* Delete Area */}
        <TouchableOpacity
          onPress={showDeleteAlert}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#FF3B30',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16
          }}
        >
          <Animated.View style={[{ width: '100%', alignItems: 'center' }, deleteAreaStyle]}>
            <Feather name="trash-2" size={24} color="white" />
          </Animated.View>
        </TouchableOpacity>

        <GestureDetector gesture={Gesture.Race(panTap, panGesture)}>
          <Animated.View style={[{ 
            backgroundColor: themeColors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: themeColors.border,
            minWidth: width - 32,
            width: '100%',
            overflow: 'hidden'
          }, animatedContainerStyle]}>
            {/* Header - Always visible with natural height */}
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
                    {tag.activity_name}
                  </ThemedText>
                  <ThemedText style={{ color: themeColors.placeholderTextColor }}>
                    ({tag.friends.length})
                  </ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => onManageFriends(tag)}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Feather name="user-plus" size={16} color={themeColors.text} />
                  </TouchableOpacity>
                  <Animated.View style={chevronStyle}>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={themeColors.text}
                    />
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* Expandable Content - Only shown when expanded */}
            {isExpanded && (
              <View style={{ 
                paddingHorizontal: 16,
                paddingBottom: 16
              }}>
                <View style={{ gap: 8 }}>
                  {tag.friends.map((friend) => (
                    <FriendListUserItem
                      key={friend._id}
                      _id={friend._id}
                      name={friend.full_name}
                      subtitle={`@${friend.username}`}
                      avatarUri={friend.profile_picture}
                      status="manageTagFriend"
                      tagName={tag.activity_name}
                      onRemove={() => onRemoveFriend(friend._id, friend.full_name, tag.activity_name)}
                    />
                  ))}
                  {tag.friends.length === 0 && (
                    <View style={{ 
                      alignItems: 'center',
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: themeColors.border,
                      width: '100%',
                      minHeight: 120,
                      justifyContent: 'center'
                    }}>
                      <View style={{ marginBottom: 12 }}>
                        <Feather
                          name="users"
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
                        No friends tagged
                      </ThemedText>
                      <ThemedText 
                        style={{ 
                          fontSize: 14, 
                          color: themeColors.placeholderTextColor,
                          textAlign: 'center',
                          opacity: 0.8
                        }}
                      >
                        Add friends to this activity tag
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

export type TagsRef = {
  setShowCreateModal: (show: boolean) => void;
};

const Tags = forwardRef<TagsRef>((_, ref) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTags, setExpandedTags] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageFriendsModal, setShowManageFriendsModal] = useState(false);
  const [selectedTagForManage, setSelectedTagForManage] = useState<Tag | null>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useImperativeHandle(ref, () => ({
    setShowCreateModal
  }));

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/api/users/tags');
      setTags(response.data.tags);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setLoading(false);
    }
  };

  const handleTagPress = (activityName: string) => {
    setExpandedTags(prev => {
      const isCurrentlyExpanded = prev.includes(activityName);
      if (isCurrentlyExpanded) {
        return prev.filter(tag => tag !== activityName);
      } else {
        return [...prev, activityName];
      }
    });
  };

  const handleManageFriends = (tag: Tag) => {
    setSelectedTagForManage(tag);
    setShowManageFriendsModal(true);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchTags().finally(() => setRefreshing(false));
  }, []);

  const handleRemoveFriend = async (friendId: string, friendName: string, tagName: string) => {
    try {
      await api.delete('/api/users/tags/friends', {
        data: {
          activity_name: tagName,
          friend_ids: [friendId]
        }
      });
      Alert.alert(
        'Success',
        `${friendName} has been removed from ${tagName} tag`,
        [{ text: 'OK', onPress: fetchTags }]
      );
    } catch (error) {
      console.error('Error removing friend from tag:', error);
      Alert.alert('Error', 'Failed to remove friend from tag. Please try again.');
    }
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.mountainGreen} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
      >
        <View style={{ gap: 16 }}>
          {tags.length > 0 ? (
            tags.map((tag) => (
              <TagItem
                key={tag.activity_name}
                tag={tag}
                isExpanded={expandedTags.includes(tag.activity_name)}
                onTagPress={handleTagPress}
                onManageFriends={handleManageFriends}
                onRemoveFriend={handleRemoveFriend}
                onRefresh={fetchTags}
                themeColors={themeColors}
              />
            ))
          ) : (
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={{
                backgroundColor: themeColors.background,
                borderRadius: 12,
                padding: 16,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: themeColors.border,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
              }}
            >
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
                No activity tags yet
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                Tap here to create your first activity tag!
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <CreateTagModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchTags}
      />

      {selectedTagForManage && (
        <ManageTagFriendsModal
          visible={showManageFriendsModal}
          onClose={() => {
            setShowManageFriendsModal(false);
            setSelectedTagForManage(null);
          }}
          tagName={selectedTagForManage.activity_name}
          currentFriends={selectedTagForManage.friends}
          onSuccess={fetchTags}
        />
      )}
    </ThemedView>
  );
});

Tags.displayName = 'Tags';

export default Tags; 