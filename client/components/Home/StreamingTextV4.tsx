import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
} from 'react-native-reanimated';

interface StreamingTextV4Props {
  text: string;
  style?: any;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
  enableTypingEffect?: boolean;
}

const StreamingTextV4 = React.memo<StreamingTextV4Props>(({ 
  text, 
  style,
  isStreaming = false,
  onStreamComplete,
  enableTypingEffect = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const targetTextRef = useRef(text);
  const currentIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    targetTextRef.current = text;
    
    if (!isStreaming || !enableTypingEffect) {
      setDisplayedText(text);
      currentIndexRef.current = text.length;
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const streamText = () => {
      if (currentIndexRef.current < targetTextRef.current.length) {
        currentIndexRef.current++;
        setDisplayedText(targetTextRef.current.slice(0, currentIndexRef.current));
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onStreamComplete) {
          onStreamComplete();
        }
      }
    };

    if (text.length > displayedText.length) {
      intervalRef.current = setInterval(streamText, 30) as unknown as NodeJS.Timeout;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isStreaming, enableTypingEffect, onStreamComplete]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cancelAnimation(opacity);
    };
  }, [opacity]);

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {displayedText}
    </Animated.Text>
  );
});

StreamingTextV4.displayName = 'StreamingTextV4';

interface StreamingInsightCardV4Props {
  title: string;
  subtitle: string;
  isStreaming: boolean;
  titleStyle?: any;
  subtitleStyle?: any;
  onComplete?: () => void;
}

export const StreamingInsightCardV4 = React.memo<StreamingInsightCardV4Props>(({
  title,
  subtitle,
  isStreaming,
  titleStyle,
  subtitleStyle,
  onComplete
}) => {
  const [titleComplete, setTitleComplete] = useState(false);
  const [subtitleComplete, setSubtitleComplete] = useState(false);

  const handleTitleComplete = useCallback(() => {
    setTitleComplete(true);
  }, []);

  const handleSubtitleComplete = useCallback(() => {
    setSubtitleComplete(true);
  }, []);

  useEffect(() => {
    if (titleComplete && subtitleComplete && onComplete) {
      onComplete();
    }
  }, [titleComplete, subtitleComplete, onComplete]);

  useEffect(() => {
    if (isStreaming) {
      setTitleComplete(false);
      setSubtitleComplete(false);
    } else if (!isStreaming && title && subtitle) {
      setTitleComplete(true);
      setSubtitleComplete(true);
    }
  }, [isStreaming, title, subtitle]);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <StreamingTextV4
          text={title}
          style={titleStyle}
          isStreaming={isStreaming}
          onStreamComplete={handleTitleComplete}
          enableTypingEffect={true}
        />
      </View>
      <StreamingTextV4
        text={subtitle}
        style={subtitleStyle}
        isStreaming={isStreaming && titleComplete}
        onStreamComplete={handleSubtitleComplete}
        enableTypingEffect={true}
      />
    </>
  );
});

StreamingInsightCardV4.displayName = 'StreamingInsightCardV4';

export interface IsolatedStreamingTextV4Ref {
  updateTitle: (title: string) => void;
  updateSubtitle: (subtitle: string) => void;
  appendToTitle: (content: string) => void;
  appendToSubtitle: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearContent: () => void;
  setText: (title: string, subtitle: string) => void;
}

interface IsolatedStreamingTextV4Props {
  titleStyle?: any;
  subtitleStyle?: any;
  onComplete?: () => void;
}

export const IsolatedStreamingTextV4 = forwardRef<IsolatedStreamingTextV4Ref, IsolatedStreamingTextV4Props>(
  ({ titleStyle, subtitleStyle, onComplete }, ref) => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    const updateTitle = useCallback((newTitle: string) => {
      setTitle(newTitle);
    }, []);

    const updateSubtitle = useCallback((newSubtitle: string) => {
      setSubtitle(newSubtitle);
    }, []);

    const appendToTitle = useCallback((content: string) => {
      setTitle(prev => prev + content);
    }, []);

    const appendToSubtitle = useCallback((content: string) => {
      setSubtitle(prev => prev + content);
    }, []);

    const setStreamingState = useCallback((streaming: boolean) => {
      setIsStreaming(streaming);
    }, []);

    const clearContent = useCallback(() => {
      setTitle('');
      setSubtitle('');
      setIsStreaming(false);
    }, []);

    const setText = useCallback((newTitle: string, newSubtitle: string) => {
      setTitle(newTitle);
      setSubtitle(newSubtitle);
    }, []);

    useImperativeHandle(ref, () => ({
      updateTitle,
      updateSubtitle,
      appendToTitle,
      appendToSubtitle,
      setStreaming: setStreamingState,
      clearContent,
      setText,
    }), [updateTitle, updateSubtitle, appendToTitle, appendToSubtitle, setStreamingState, clearContent, setText]);

    return (
      <StreamingInsightCardV4
        title={title}
        subtitle={subtitle}
        isStreaming={isStreaming}
        titleStyle={titleStyle}
        subtitleStyle={subtitleStyle}
        onComplete={onComplete}
      />
    );
  }
);

IsolatedStreamingTextV4.displayName = 'IsolatedStreamingTextV4';