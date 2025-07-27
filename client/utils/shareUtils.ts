import { Share } from 'react-native';

export const shareContent = async (type: 'event' | 'profile', id: string, title: string) => {
  // Simplified URL structure - direct universal links
  const baseUrl = 'https://kinovo.app';
  const url = `${baseUrl}/${type}/${id}`;
  
  const message = {
    title: `Check out this ${type} on Kinovo`,
    message: type === 'event' ? `Check out this event "${title}" on Kinovo` : title,
    url: url
  };

  try {
    const result = await Share.share({
      message: message.message,
      url: url, // iOS only
      title: message.title
    });
    
    if (result.action === Share.sharedAction) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
}; 