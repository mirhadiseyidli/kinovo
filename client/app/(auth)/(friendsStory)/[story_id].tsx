import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Event as EventType } from '@/types/allTypes';
import { getColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import EventCard from '@/components/Story/EventCard';
import SwipeControls from '@/components/Story/SwipeControls';
import DetailOverlay from '@/components/Story/DetailOverlay';
import { setStoryPlaying, selectStoryPlaying } from '@/store/eventPlayStorySlice';

const ViewEvent = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch(); // Initialize dispatch
  const { story_id } = useLocalSearchParams();

  const id = Array.isArray(story_id) ? story_id[0] : story_id;
  const storyEvents = useSelector(
    (state: RootState) => state.eventStories.eventMap[id]
  );
  const stories = storyEvents || [];
  const storyPlaying = useSelector(selectStoryPlaying);

  const [content, setContent] = useState<{ content: any; type: string; finish: number, event: EventType }[]>([]);
  const [end, setEnd] = useState(0);
  const [current, setCurrent] = useState(0);
  const [load, setLoad] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const colors = useImageColors(content[current]?.content?.uri ?? '');
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
    
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (stories.length > 0) {
      const items = stories.map((story) => ({
        content: story.event.event_picture || require('@/assets/event-default.png'),
        type: 'image',
        finish: 0,
        event: story.event, // ← Add this line
      }));
      
      setContent(items);
    }
  }, [stories]);

  useEffect(() => {
    if (content.length > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      progress.setValue(0);
      play();
    }
  }, [current]);

  useFocusEffect(
    useCallback(() => {
      if (storyPlaying) {
        play();
        dispatch(setStoryPlaying(false));
      }
    }, [storyPlaying])
  );

  const pause = () => {
    progress.stopAnimation();
  };

  const start = (n: number) => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) next();
    });
  };

  const play = () => start(end);

  const next = () => {
    if (current !== content.length - 1) {
      let data = [...content];
      data[current].finish = 1;
      setContent(data);
      setCurrent(current + 1);
      progress.setValue(0);
      setLoad(false);
    } else {
      close();
    }
  };

  const previous = () => {
    if (current - 1 >= 0) {
      let data = [...content];
      data[current].finish = 0;
      setContent(data);
      setCurrent(current - 1);
      progress.setValue(0);
      setLoad(false);
    } else {
      close();
    }
  };

  const close = () => {
    progress.setValue(0);
    setLoad(false);
    navigation.goBack();
  };

  return (
    <>
      <LinearGradient 
        colors={
          colors?.platform === 'ios'
            ? [colors.primary, colors.secondary]
            : [themeColors.mountainGreen, themeColors.background] // fallback for Android/Web or missing values
        }
        style={{ flex: 1, height: '100%', width: '100%', paddingTop: insets.top }}
      >
        {content[current] && (
          <View style={{ flex: 1 }}>
            <EventCard
              content={content}
              current={current}
              fadeAnim={fadeAnim}
              progress={progress}
              play={play}
              close={close}
              colors={colors}
            />
          </View>
        )}
      </LinearGradient>
      <SwipeControls
        pause={pause}
        play={play}
        previous={previous}
        next={next}
        isLongPress={isLongPress}
        setIsLongPress={setIsLongPress}
      />
      <DetailOverlay
        bounceAnim={bounceAnim}
        content={content}
        current={current}
        themeColors={themeColors}
        router={router}
        pause={pause}
      />
    </>
  );
};

export default ViewEvent;

const useImageColors = (url: string) => {
  const [colors, setColors] = React.useState<ImageColorsResult | null>(null);
  const url_1 = require('@/assets/event-default.png');

  React.useEffect(() => {
    if (!url) return;
    getColors(url_1, {
      fallback: '#228B22',
      cache: true,
      key: url,
    }).then(setColors);
  }, [url]);

  return colors;
};