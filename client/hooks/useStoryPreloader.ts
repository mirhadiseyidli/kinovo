import { useState, useEffect, useCallback } from 'react';
import { Image } from 'react-native';
import { FriendEventActivity } from '@/types/allTypes';

interface PreloadedStory {
  friendId: string;
  events: FriendEventActivity[];
  preloadedImages: { [eventId: string]: boolean };
  isFullyLoaded: boolean;
}

interface UseStoryPreloaderReturn {
  preloadedStories: { [friendId: string]: PreloadedStory };
  preloadStory: (friendId: string, events: FriendEventActivity[]) => Promise<void>;
  isStoryPreloaded: (friendId: string) => boolean;
  getPreloadedStory: (friendId: string) => PreloadedStory | null;
}

export const useStoryPreloader = (): UseStoryPreloaderReturn => {
  const [preloadedStories, setPreloadedStories] = useState<{ [friendId: string]: PreloadedStory }>({});

  const preloadImage = useCallback((uri: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!uri) {
        resolve(false);
        return;
      }

      Image.prefetch(uri)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }, []);

  const preloadStory = useCallback(async (friendId: string, events: FriendEventActivity[]): Promise<void> => {
    if (!events || events.length === 0) return;

    // Initialize the preloaded story
    const initialStory: PreloadedStory = {
      friendId,
      events,
      preloadedImages: {},
      isFullyLoaded: false,
    };

    setPreloadedStories(prev => ({
      ...prev,
      [friendId]: initialStory,
    }));

    // Preload all event images
    const imagePromises = events.map(async (eventActivity) => {
      const eventPicture = eventActivity.event?.event_picture;
      if (eventPicture) {
        const isLoaded = await preloadImage(eventPicture);
        return { eventId: eventActivity.event._id, isLoaded };
      }
      return { eventId: eventActivity.event._id, isLoaded: true }; // No image to load
    });

    try {
      const results = await Promise.all(imagePromises);
      
      // Update the preloaded images status
      setPreloadedStories(prev => {
        const currentStory = prev[friendId];
        if (!currentStory) return prev;

        const preloadedImages: { [eventId: string]: boolean } = {};
        results.forEach(({ eventId, isLoaded }) => {
          if (eventId) {
            preloadedImages[eventId] = isLoaded;
          }
        });

        return {
          ...prev,
          [friendId]: {
            ...currentStory,
            preloadedImages,
            isFullyLoaded: true,
          },
        };
      });
    } catch (error) {
      console.error('Error preloading story images:', error);
      // Mark as fully loaded even if some images failed
      setPreloadedStories(prev => ({
        ...prev,
        [friendId]: {
          ...prev[friendId],
          isFullyLoaded: true,
        },
      }));
    }
  }, [preloadImage]);

  const isStoryPreloaded = useCallback((friendId: string): boolean => {
    const story = preloadedStories[friendId];
    return story?.isFullyLoaded || false;
  }, [preloadedStories]);

  const getPreloadedStory = useCallback((friendId: string): PreloadedStory | null => {
    return preloadedStories[friendId] || null;
  }, [preloadedStories]);

  return {
    preloadedStories,
    preloadStory,
    isStoryPreloaded,
    getPreloadedStory,
  };
}; 