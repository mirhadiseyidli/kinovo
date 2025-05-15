import { useAuthSession } from '@/components/Auth/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const useManageFriends = () => {
  const { refreshAccessToken } = useAuthSession();

  const postWithRetry = async (url: string, data?: any) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        await refreshAccessToken();
        const retryToken = await AsyncStorage.getItem('accessToken');
        return await axios.post(url, data, {
          headers: {
            Authorization: `Bearer ${retryToken}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        throw error;
      }
    }
  };

  const getWithRetry = async (url: string) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        await refreshAccessToken();
        const retryToken = await AsyncStorage.getItem('accessToken');
        return await axios.get(url, {
          headers: {
            Authorization: `Bearer ${retryToken}`,
          },
        });
      } else {
        throw error;
      }
    }
  };

  const sendFriendRequest = (receiver: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friendrequests/send`, { receiver });

  const acceptFriendRequest = (sender: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friendrequests/accept`, { sender });

  const rejectFriendRequest = (sender: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friendrequests/reject`, { sender });

  const cancelFriendRequestSender = (receiver: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friendrequests/sender/cancel`, { receiver });

  const cancelFriendRequestReceiver = (sender: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friendrequests/receiver/cancel`, { sender });

  const getUserFriends = () =>
    getWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/friends`);

  const syncContacts = (phoneNumbers: (string | undefined)[]) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/contacts/sync`, { phoneNumbers });

  const getReceivedFriendRequests = () =>
    getWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/received/friend/requests`);

  const removeFriendFromFriendList = (friendId: string) =>
    postWithRetry(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/friends/remove/friend/from/friendslist`, { friendId });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequestSender,
    cancelFriendRequestReceiver,
    getUserFriends,
    syncContacts,
    getReceivedFriendRequests,
    removeFriendFromFriendList
  };
};
