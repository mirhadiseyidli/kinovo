import React, { useState, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

/**
 * StreamingText Component
 * Displays text that streams in character by character in real-time
 * Isolated component to prevent re-renders of parent component
 */

interface StreamingTextProps {
  text: string;
  style?: any;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
}

export const StreamingText = React.memo<StreamingTextProps>(({ 
  text, 
  style,
  isStreaming = false,
  onStreamComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const targetTextRef = useRef(text);
  const currentIndexRef = useRef(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // If new text comes in and we're streaming, update the target
    targetTextRef.current = text;
    
    // If not streaming, just show the full text immediately
    if (!isStreaming) {
      setDisplayedText(text);
      currentIndexRef.current = text.length;
      return;
    }

    // Start streaming animation
    const streamText = () => {
      if (currentIndexRef.current < targetTextRef.current.length) {
        // Add one more character
        currentIndexRef.current++;
        setDisplayedText(targetTextRef.current.slice(0, currentIndexRef.current));
        
        // Continue streaming
        animationFrameRef.current = requestAnimationFrame(streamText);
      } else if (onStreamComplete) {
        onStreamComplete();
      }
    };

    // Start the streaming
    if (text.length > displayedText.length) {
      animationFrameRef.current = requestAnimationFrame(streamText);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, isStreaming]);

  return <Text style={style}>{displayedText}</Text>;
});

StreamingText.displayName = 'StreamingText';

/**
 * StreamingInsightCard Component
 * Handles the streaming of title and subtitle independently
 * This component is isolated to prevent re-renders affecting other UI
 */

interface StreamingInsightCardProps {
  title: string;
  subtitle: string;
  isStreaming: boolean;
  titleStyle?: any;
  subtitleStyle?: any;
  onComplete?: () => void;
}

export const StreamingInsightCard = React.memo<StreamingInsightCardProps>(({
  title,
  subtitle,
  isStreaming,
  titleStyle,
  subtitleStyle,
  onComplete
}) => {
  const [titleComplete, setTitleComplete] = useState(false);
  const [subtitleComplete, setSubtitleComplete] = useState(false);

  useEffect(() => {
    if (titleComplete && subtitleComplete && onComplete) {
      onComplete();
    }
  }, [titleComplete, subtitleComplete, onComplete]);

  // Reset completion states when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setTitleComplete(false);
      setSubtitleComplete(false);
    }
  }, [isStreaming]);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <StreamingText
          text={title}
          style={titleStyle}
          isStreaming={isStreaming}
          onStreamComplete={() => setTitleComplete(true)}
        />
      </View>
      <StreamingText
        text={subtitle}
        style={subtitleStyle}
        isStreaming={isStreaming && titleComplete} // Start subtitle after title completes
        onStreamComplete={() => setSubtitleComplete(true)}
      />
    </>
  );
});

StreamingInsightCard.displayName = 'StreamingInsightCard';