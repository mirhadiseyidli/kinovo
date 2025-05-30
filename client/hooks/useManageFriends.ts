import { useCallback } from 'react';
import api from '@/utils/api';

export const useManageFriends = () => {
  const sendFriendRequest = useCallback((receiver: string) =>
    api.post('/api/managefriends/friendrequests/send', { receiver }), []);

  const acceptFriendRequest = useCallback((sender: string) =>
    api.post('/api/managefriends/friendrequests/accept', { sender }), []);

  const rejectFriendRequest = useCallback((sender: string) =>
    api.post('/api/managefriends/friendrequests/reject', { sender }), []);

  const cancelFriendRequestSender = useCallback((receiver: string) =>
    api.post('/api/managefriends/friendrequests/sender/cancel', { receiver }), []);

  const cancelFriendRequestReceiver = useCallback((sender: string) =>
    api.post('/api/managefriends/friendrequests/receiver/cancel', { sender }), []);

  const getUserFriends = useCallback(() =>
    api.get('/api/managefriends/user/get/friends'), []);

  const syncContacts = useCallback((phoneNumbers: (string | undefined)[]) =>
    api.post('/api/managefriends/user/contacts/sync', { phoneNumbers }), []);

  const getReceivedFriendRequests = useCallback(() =>
    api.get('/api/managefriends/user/get/received/friend/requests'), []);

  const removeFriendFromFriendList = useCallback((friendId: string) =>
    api.post('/api/managefriends/friends/remove/friend/from/friendslist', { friendId }), []);

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
