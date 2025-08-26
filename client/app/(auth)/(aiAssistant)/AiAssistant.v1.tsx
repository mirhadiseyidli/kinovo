import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { useNavigation, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '@/context/LocationContext';
import { ContextualLoading } from '@/components/Home/ShimmerLoading';

type MessageRole = 'user' | 'assistant';

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
};

// Hook for AI chat functionality with conversation persistence
const useAIChat = (
  flatListRef?: React.RefObject<FlashListRef<Message> | null>, 
  isAtBottom?: boolean, 
  userScrollingRef?: React.RefObject<boolean>,
  animationRef?: React.RefObject<number | null>,
  setIsAnimating?: (animating: boolean) => void,
  setShowScrollToBottom?: (show: boolean) => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { userId } = useAuthSession();
  const { currentLocation } = useLocation();

  // Load conversation history on mount
  const loadConversationHistory = async () => {
    if (!userId) return;
    
    setIsLoadingHistory(true);
    try {
      // Try to get the most recent conversation from storage
      const savedConversationId = await AsyncStorage.getItem(`ai_current_conversation_${userId}`);
      
      if (savedConversationId) {
        const response = await api.get(`/api/ai/conversations/${savedConversationId}`);
        if (response.data.success && response.data.data) {
          const conversation = response.data.data;
          setCurrentConversationId(conversation.conversationId);
          
          // Convert timestamps back to Date objects
          const messagesWithDates = conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          setMessages(messagesWithDates);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Clear invalid conversation ID
      if (userId) {
        await AsyncStorage.removeItem(`ai_current_conversation_${userId}`);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save current conversation ID to storage
  const saveCurrentConversationId = async (conversationId: string) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`ai_current_conversation_${userId}`, conversationId);
    } catch (error) {
      console.error('Failed to save current conversation ID:', error);
    }
  };

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare the request payload with conversation context
      const requestPayload: any = {
        messages: [
          ...messages.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: content.trim() }
        ],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userLocation: currentLocation ? {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          city: currentLocation.city,
          state: currentLocation.state,
          text: currentLocation.text
        } : null,
      };

      // Include current conversation ID if available
      if (currentConversationId) {
        requestPayload.conversationId = currentConversationId;
      }

      // Get the complete response from the API
      const response = await api.post('/api/ai/agent', requestPayload);

      // Get the assistant's response content and conversation ID
      const assistantContent = response.data.content || response.data.message || 'Sorry, I encountered an error.';
      const responseConversationId = response.data.conversationId;
      const assistantMessageId = (Date.now() + 1).toString();
      
      // Update conversation ID if we got a new one
      if (responseConversationId && responseConversationId !== currentConversationId) {
        setCurrentConversationId(responseConversationId);
        await saveCurrentConversationId(responseConversationId);
      }
      
      // Create the assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      // Add empty assistant message first
      setMessages(prev => [...prev, assistantMessage]);
      
      // Let the component handle scrolling behavior
      
      // Improved word/chunk-based animation with better scroll control
      const responseLength = assistantContent.length;
      
      // Split into words for better animation
      const words = assistantContent.split(/(\s+)/);
      let currentWordIndex = 0;
      
      const animateText = () => {
        if (currentWordIndex < words.length) {
          // Add words progressively based on response length
          const wordsToAdd = responseLength > 500 ? 3 : responseLength > 200 ? 2 : 1;
          const nextIndex = Math.min(currentWordIndex + wordsToAdd, words.length);
          const partialContent = words.slice(0, nextIndex).join('');
          
          setMessages(prev => {
            const updated = [...prev];
            const messageIndex = updated.findIndex(msg => msg.id === assistantMessageId);
            if (messageIndex >= 0) {
              updated[messageIndex] = {
                ...updated[messageIndex],
                content: partialContent,
              };
            }
            return updated;
          });
          
          // Update scroll to bottom visibility
          if (!isAtBottom) {
            setShowScrollToBottom?.(true);
          }
          
          currentWordIndex = nextIndex;
          
          // Adaptive speed based on response length
          const delay = responseLength > 500 ? 20 : responseLength > 200 ? 30 : 50;
          const timeoutId = setTimeout(animateText, delay);
          animationRef!.current = timeoutId as any;
        } else {
          setIsLoading(false);
          setIsAnimating?.(false);
          animationRef!.current = null;
        }
      };
      
      // Start animation
      animateText();
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear messages and start new conversation
  const clearMessages = async () => {
    setMessages([]);
    setCurrentConversationId(null);
    if (userId) {
      await AsyncStorage.removeItem(`ai_current_conversation_${userId}`);
    }
  };

  // Stop animation function
  const stopAnimation = () => {
    if (animationRef?.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsLoading(false);
    setIsAnimating?.(false);
  };

  return {
    messages,
    sendMessage,
    isLoading,
    isLoadingHistory,
    currentConversationId,
    clearMessages,
    loadConversationHistory,
    stopAnimation,
  };
};

export default function AiAssistantV2() {
  const [input, setInput] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const userScrollingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const flatListRef = useRef<FlashListRef<Message>>(null);
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    isLoadingHistory, 
    currentConversationId, 
    clearMessages, 
    loadConversationHistory,
    stopAnimation 
  } = useAIChat(flatListRef, isAtBottom, userScrollingRef, animationRef, setIsAnimating, setShowScrollToBottom);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Load conversation history when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadConversationHistory();
    }, [])
  );

  // Position user message at top when they send a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.role === 'user') {
        setTimeout(() => {
          // Calculate offset to position user message at top
          const messageHeight = 60; // Approximate height of a message
          const totalMessagesHeight = messages.length * messageHeight;
          const paddingTop = 16;
          const targetOffset = totalMessagesHeight - messageHeight + paddingTop;
          
          flatListRef.current?.scrollToOffset({ 
            offset: targetOffset, 
            animated: true 
          });
        }, 100);
      }
    }
  }, [messages.length]);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Create header right buttons
  const headerRightButton = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <TouchableOpacity onPress={() => router.replace('/(auth)/(aiAssistant)/ConversationList')}>
        <Feather 
          name="list" 
          size={20} 
          color={themeColors.tint}
        />
      </TouchableOpacity>
      {messages.length > 0 && (
        <TouchableOpacity onPress={clearMessages}>
          <Text style={{ color: themeColors.tint, fontSize: 16 }}>
            Clear
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Set up header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => headerRightButton,
    });
  }, [navigation, headerRightButton]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setLastUserMessage(message);
    setInput('');
    
    await sendMessage(message);
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View
      style={{
        marginVertical: 6,
        marginHorizontal: 16,
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
      }}
    >
      {item.role === 'user' ? (
        <View
          style={{
            maxWidth: '85%',
            padding: 12,
            borderRadius: 12,
            backgroundColor: themeColors.eventCardBackgroundColor,
          }}
        >
          <ThemedText style={{ 
            fontSize: 16,
            color: themeColors.text
          }}>
            {item.content}
          </ThemedText>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          <ThemedText style={{ 
            fontSize: 16,
            color: themeColors.text,
            lineHeight: 22,
          }}>
            {item.content}
          </ThemedText>
        </View>
      )}
    </View>
  ), [themeColors, colorScheme]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoadingHistory) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingVertical: 100,
        }}>
          <Text style={{
            fontSize: 24,
            marginBottom: 16,
          }}>🤖</Text>
          <ThemedText style={{
            fontSize: 16,
            textAlign: 'center',
            opacity: 0.7,
          }}>
            Loading conversation history...
          </ThemedText>
        </View>
      );
    }
    
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 100,
      }}>
        <Text style={{
          fontSize: 24,
          marginBottom: 16,
        }}>🤖</Text>
        <ThemedText style={{
          fontSize: 18,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {currentConversationId ? 'Welcome back!' : 'Hi! I\'m your Kinovo AI Assistant'}
        </ThemedText>
        <ThemedText style={{
          fontSize: 16,
          textAlign: 'center',
          opacity: 0.7,
          lineHeight: 22,
        }}>
          {currentConversationId 
            ? 'Continue our conversation or start a new topic!' 
            : 'I can help you create events, find activities, check weather, get directions, and more!'
          }
        </ThemedText>
        {currentConversationId && (
          <ThemedText style={{
            fontSize: 14,
            textAlign: 'center',
            opacity: 0.5,
            marginTop: 8,
          }}>
            Conversation ID: {currentConversationId.substring(0, 8)}...
          </ThemedText>
        )}
      </View>
    );
  }, [isLoadingHistory, currentConversationId]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ flex: 1 }}>
        {/* Messages - FlashList for optimal chat performance */}
        <FlashList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={renderEmptyComponent}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 50;
            setIsAtBottom(isAtBottom);
            
            // Hide scroll to bottom button when at bottom
            if (isAtBottom) {
              setShowScrollToBottom(false);
            }
          }}
          onScrollBeginDrag={() => {
            userScrollingRef.current = true;
          }}
          onScrollEndDrag={() => {
            setTimeout(() => {
              userScrollingRef.current = false;
            }, 100);
          }}
          scrollEventThrottle={16}
        />

        {/* Loading indicator */}
        {isLoading && !isAnimating && (
          <View style={{
            marginVertical: 6,
            marginHorizontal: 16,
            alignSelf: 'flex-start',
          }}>
            <ContextualLoading 
              themeColors={themeColors}
              userMessage={lastUserMessage}
            />
          </View>
        )}


        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <View style={{
            position: 'absolute',
            bottom: keyboardVisible ? 100 : Math.max(insets.bottom + 80, 100),
            right: 16,
            zIndex: 100,
          }}>
            <TouchableOpacity
              onPress={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                setShowScrollToBottom(false);
              }}
              style={{
                backgroundColor: themeColors.mountainGreen,
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Feather name="chevron-down" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            paddingTop: 8,
            paddingBottom: keyboardVisible ? 16 : Math.max(insets.bottom, 8),
            paddingHorizontal: 16,
            justifyContent: 'center',
            backgroundColor: themeColors.background,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              maxHeight: 120,
              textAlignVertical: 'top',
              color: themeColors.text,
              backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F1F0F0',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginRight: 8,
            }}
            multiline
            numberOfLines={4}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything about events..."
            placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
            scrollEnabled
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            onPress={isAnimating ? stopAnimation : handleSendMessage}
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: isAnimating ? themeColors.mountainGreen : (input.trim() && !isLoading ? themeColors.mountainGreen : colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA'),
              justifyContent: 'center',
              alignSelf: 'flex-end',
            }}
            disabled={!isAnimating && (!input.trim() || isLoading)}
          >
            <Feather 
              name={isAnimating ? "square" : "send"} 
              size={isAnimating ? 18 : 22} 
              color={isAnimating ? themeColors.text : (input.trim() && !isLoading ? themeColors.text : '#8E8E93')}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}