import React from 'react';
import { ManageFriendButtonProps } from '@/types/allTypes';
import { TouchableOpacity, Text, Alert, View, ActivityIndicator } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { useManageFriends } from '@/hooks/useManageFriends';

const AlreadyFriendsAndUnfriendButton = ({ targetUser, loadingFriendAction, buttonFlex = 1, onUnfriend }: ManageFriendButtonProps & { onUnfriend?: () => Promise<void> }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { removeFriendFromFriendList } = useManageFriends();

  const alertUserBeforeRemoving = () => {
      Alert.alert(
        'Remove Friend',
        'Are you sure you want to remove this friend from your friends list?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeFriendFromFriendList(targetUser);
                
                // Call onUnfriend callback to refresh the UI
                if (onUnfriend) {
                  await onUnfriend();
                }
                
                // Show success message
                Alert.alert('Success', 'Friend removed successfully');
              } catch (error: any) {
                console.error('Error removing friend:', error);
                Alert.alert('Error', error?.response?.data?.message || 'Failed to remove friend. Please try again.');
              }
            },
          },
        ],
        { cancelable: true }
      );
    };

  return (
    <TouchableOpacity
      style={{
        marginTop: 16,
        flex: buttonFlex,
        backgroundColor: themeColors.mountainGreen,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onPress={alertUserBeforeRemoving}
    >
      {loadingFriendAction ? (
        <ActivityIndicator size={'small'}/>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Feather name='check' color={themeColors.text} size={16}/>
          <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Friends</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default AlreadyFriendsAndUnfriendButton;