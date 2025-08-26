import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StreamingInsightCard } from './StreamingText';

interface IsolatedStreamingTextProps {
  titleStyle?: any;
  subtitleStyle?: any;
  onComplete?: () => void;
}

export interface IsolatedStreamingTextRef {
  updateTitle: (title: string) => void;
  updateSubtitle: (subtitle: string) => void;
  appendToTitle: (content: string) => void;
  appendToSubtitle: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearContent: () => void;
}

/**
 * Completely isolated streaming text component
 * Manages its own state to prevent parent re-renders
 */
export const IsolatedStreamingText = forwardRef<IsolatedStreamingTextRef, IsolatedStreamingTextProps>(
  ({ titleStyle, subtitleStyle, onComplete }, ref) => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    useImperativeHandle(ref, () => ({
      updateTitle: (newTitle: string) => setTitle(newTitle),
      updateSubtitle: (newSubtitle: string) => setSubtitle(newSubtitle),
      appendToTitle: (content: string) => setTitle(prev => prev + content),
      appendToSubtitle: (content: string) => setSubtitle(prev => prev + content),
      setStreaming: (streaming: boolean) => setIsStreaming(streaming),
      clearContent: () => {
        setTitle('');
        setSubtitle('');
        setIsStreaming(false);
      },
    }), []);

    return (
      <StreamingInsightCard
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

IsolatedStreamingText.displayName = 'IsolatedStreamingText';