import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, View } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather, Octicons } from '@expo/vector-icons';
import { ManageFriendButtonProps } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuthSession } from './Auth/AuthProvider';
import { useManageFriends } from '@/hooks/useManageFriends';

const PendingFriendRequestButton = ({ targetUser, loadingFriendAction, buttonFlex = 1, onCancelPendingRequest }: ManageFriendButtonProps & { onCancelPendingRequest?: () => void }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { cancelFriendRequestSender } = useManageFriends();

  const alertUserBeforeCancelling = () => {
    Alert.alert(
      'Cancel Friend Request',
      "You're about to cancel your friend request. Are you sure?",
      [
        {
          text: 'Keep Request',
          style: 'cancel',
        },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => {
            cancelFriendRequestSender(targetUser);
            if (onCancelPendingRequest) onCancelPendingRequest();
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
      onPress={alertUserBeforeCancelling}
    >
      {loadingFriendAction ? (
        <ActivityIndicator size={'small'}/>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Feather name='clock' color={themeColors.text} size={16}/>
          <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Pending</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default PendingFriendRequestButton;