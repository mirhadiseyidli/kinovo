import React from 'react';
import { ManageFriendButtonProps } from '@/types/allTypes';
import { TouchableOpacity, Text, Alert, View, ActivityIndicator } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { useManageFriends } from '@/hooks/useManageFriends';

const AlreadyFriendsAndUnfriendButton = ({ targetUser, loadingFriendAction, onUnfriend }: ManageFriendButtonProps & { onUnfriend?: () => void }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { removeFriendFromFriendList } = useManageFriends();

  const alertUserBeforeRemoving = () => {
      Alert.alert(
        'Cancel Friend Request',
        "You're about to cancel your friend request. Are you sure?",
        [
          {
            text: 'Keep Friend',
            style: 'cancel',
          },
          {
            text: 'Remove Friend',
            style: 'destructive',
            onPress: () => {
              removeFriendFromFriendList(targetUser);
              if (onUnfriend) onUnfriend();
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
        flex: 1,
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