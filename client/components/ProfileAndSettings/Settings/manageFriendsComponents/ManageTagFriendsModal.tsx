import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import SelectableFriendItem from './SelectableFriendItem';
import api from '@/utils/api';
import { useGetMyFriends } from '@/hooks/useGetMyFriends';
import { IconSymbol } from '@/components/ui/IconSymbol';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Friend {
  _id: string;
  full_name: string;
  username: string;
  profile_picture?: string;
}

interface ManageTagFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  tagName: string;
  currentFriends: Friend[];
  onSuccess: () => void;
}

const ManageTagFriendsModal: React.FC<ManageTagFriendsModalProps> = ({
  visible,
  onClose,
  tagName,
  currentFriends,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [newlySelectedFriends, setNewlySelectedFriends] = useState<Friend[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchFriends } = useGetMyFriends();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setNewlySelectedFriends([]);
      setSearchQuery('');
    }
  }, [visible]);

  // Fetch all friends when modal opens
  useEffect(() => {
    if (visible) {
      const getFriendsList = async () => {
        setLoading(true);
        try {
          const fetchedFriendsList = await fetchFriends();
          setAllFriends(fetchedFriendsList);
        } catch (error) {
          console.error('Error fetching friends:', error);
        } finally {
          setLoading(false);
        }
      };
      getFriendsList();
    }
  }, [visible]);

  const handleAddFriend = (friend: Friend) => {
    setNewlySelectedFriends(prev => {
      if (!prev.some(f => f._id === friend._id)) {
        return [...prev, friend];
      }
      return prev;
    });
  };

  const handleRemoveFriend = (friendId: string) => {
    setNewlySelectedFriends(prev => prev.filter(f => f._id !== friendId));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // First handle removals
      const friendsToRemove = currentFriends.filter(
        currentFriend => !newlySelectedFriends.some(
          selectedFriend => selectedFriend._id === currentFriend._id
        )
      );

      if (friendsToRemove.length > 0) {
        await api.delete('/api/users/tags/friends', {
          data: {
            activity_name: tagName,
            friend_ids: friendsToRemove.map(f => f._id)
          }
        });
      }

      // Then handle additions - only add friends that aren't already in the tag
      const friendsToAdd = newlySelectedFriends.filter(
        newFriend => !currentFriends.some(
          currentFriend => currentFriend._id === newFriend._id
        )
      );

      if (friendsToAdd.length > 0) {
        await api.post('/api/users/tags/friends', {
          activity_name: tagName,
          friend_ids: friendsToAdd.map(f => f._id)
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating tag friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = allFriends.filter(friend => {
    const matchesSearch = friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    const isCurrentlyTagged = currentFriends.some(current => current._id === friend._id);
    const isNewlySelected = newlySelectedFriends.some(selected => selected._id === friend._id);
    return matchesSearch && !isCurrentlyTagged && !isNewlySelected;
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
      }}>
        <TouchableOpacity 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={{
          height: SCREEN_HEIGHT * 0.5,
          width: '100%',
          backgroundColor: themeColors.background,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={themeColors.text} />
            </TouchableOpacity>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
              Add Friends to {tagName}
            </ThemedText>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={loading}
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              <ThemedText style={{ 
                color: themeColors.mountainGreen,
                fontWeight: 'bold'
              }}>
                {loading ? 'Saving...' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ padding: 16 }}>
            <SearchFriendsBar
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: 16,
              width: '100%',
              gap: 16
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Newly Selected Friends Section */}
            {newlySelectedFriends.length > 0 && (
              <View style={{ gap: 8 }}>
                <ThemedText style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: themeColors.textSecondary 
                }}>
                  Selected Friends
                </ThemedText>
                {newlySelectedFriends.map((friend) => (
                  <SelectableFriendItem
                    key={friend._id}
                    _id={friend._id}
                    name={friend.full_name}
                    username={friend.username}
                    avatarUri={friend.profile_picture}
                    onSelect={() => handleRemoveFriend(friend._id)}
                    rightIcon="x"
                    isSelected={true}
                  />
                ))}
              </View>
            )}

            {/* Currently Tagged Friends Section */}
            {currentFriends.length > 0 && (
              <View style={{ gap: 8 }}>
                <ThemedText style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: themeColors.textSecondary 
                }}>
                  Currently Tagged
                </ThemedText>
                {currentFriends.map((friend) => (
                  <SelectableFriendItem
                    key={friend._id}
                    _id={friend._id}
                    name={friend.full_name}
                    username={friend.username}
                    avatarUri={friend.profile_picture}
                    disabled={true}
                    rightIcon={null}
                  />
                ))}
              </View>
            )}

            {/* Search Results Section */}
            {searchQuery && (
              <View style={{ gap: 8 }}>
                <ThemedText style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: themeColors.textSecondary 
                }}>
                  Search Results
                </ThemedText>
                {loading ? (
                  <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>Loading...</ThemedText>
                ) : filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => (
                    <SelectableFriendItem
                      key={friend._id}
                      _id={friend._id}
                      name={friend.full_name}
                      username={friend.username}
                      avatarUri={friend.profile_picture}
                      onSelect={() => handleAddFriend(friend)}
                      rightIcon="plus"
                    />
                  ))
                ) : (
                  <TouchableOpacity
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
                      <IconSymbol
                        name="magnifyingglass"
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
                      No friends found
                    </ThemedText>
                    <ThemedText 
                      style={{ 
                        fontSize: 14, 
                        color: themeColors.placeholderTextColor,
                        textAlign: 'center',
                        opacity: 0.8
                      }}
                    >
                      Try searching with a different name 🔍
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!searchQuery && !currentFriends.length && !newlySelectedFriends.length && (
              <TouchableOpacity
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
                  <IconSymbol
                    name="person.2.fill"
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
                  No friends tagged yet
                </ThemedText>
                <ThemedText 
                  style={{ 
                    fontSize: 14, 
                    color: themeColors.placeholderTextColor,
                    textAlign: 'center',
                    opacity: 0.8
                  }}
                >
                  Use the search bar to add friends to this tag 🤝
                </ThemedText>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ManageTagFriendsModal; 