import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import { ManageFriendButtonProps } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuthSession } from './Auth/AuthProvider';
import { useManageFriends } from '@/hooks/useManageFriends';

const AddFriendButton = ({ targetUser, loadingFriendAction, buttonFlex = 1, onFriendRequestSent }: ManageFriendButtonProps & { onFriendRequestSent?: () => void }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { sendFriendRequest } = useManageFriends();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendFriendRequest = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Optimistically update the parent state immediately
      if (onFriendRequestSent) {
        onFriendRequestSent();
      }
      
      // Send the actual request
      await sendFriendRequest(targetUser);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      
      // If the request failed, we should revert the optimistic update
      // by triggering a refetch in the parent component
      if (onFriendRequestSent) {
        onFriendRequestSent();
      }
    } finally {
      setIsLoading(false);
    }
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
      onPress={handleSendFriendRequest}
      disabled={isLoading}
    >
      {(loadingFriendAction || isLoading) ? (
        <ActivityIndicator size={'small'}/>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Feather name='user-plus' color={themeColors.text} size={16}/>
          <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Add Friend</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default AddFriendButton;