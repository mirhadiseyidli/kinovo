import * as Notifications from 'expo-notifications';

export const useBadgeManager = () => {
  const updateBadgeCount = async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(Math.max(0, count));
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  };

  const clearBadge = async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  };

  return {
    updateBadgeCount,
    clearBadge
  };
}; 