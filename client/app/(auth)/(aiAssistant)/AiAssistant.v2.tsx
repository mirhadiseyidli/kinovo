// ChatGPT Mobile Clone with Initial Scroll to Bottom
// Includes scroll interruption + initial scroll to latest message

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocation } from '@/context/LocationContext';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';
import MessageIdeas from '@/components/AIAssistant/MessageIdeas';
import { agentResponseSchema } from '@/components/AIAssistant/zodSchemas';
import { AiMessage, AiConversation } from '@/types/allTypes';
import { createAuthFetch as fetch } from '@/components/AIAssistant/customFetch';
import { MessageBubble } from '@/components/AIAssistant/MessageBubble';
import { ConversationSheet } from '@/components/AIAssistant/ConversationSheet';
import { experimental_useObject as useObject } from '@ai-sdk/react';

export default function AIAssistant() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [, setIsLoadingHistory] = useState<boolean>(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [dynamicPadding, setDynamicPadding] = useState<number>(0);
  const [shouldPushToTop, setShouldPushToTop] = useState<boolean>(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState<boolean>(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const flatListRef = useRef<FlashListRef<AiMessage> | null>(null);
  const hasScrolledInitially = useRef<boolean>(false);
  const initialAIMessageHeight = useRef<number>(0);
  const [isSheetVisible, setIsSheetVisible] = useState<boolean>(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [isScrollingMessageIdeas, setIsScrollingMessageIdeas] = useState<boolean>(false);
  
  const { userId } = useAuthSession();
  const { currentLocation } = useLocation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  // Create auth fetch instance
  const authFetch = fetch();

  const { object: aiResponse, submit, isLoading, stop } = useObject({
    api: `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/ai/agent/stream`,
    schema: agentResponseSchema,
    fetch: authFetch as unknown as typeof globalThis.fetch,
    onError: (error) => {
      console.error('=== useObject ERROR ===');
      console.error('useObject error:', error);
    },
    onFinish: ({ object, error }) => {
      console.log('=== useObject FINISH ===');
      console.log('isProcessing during finish:', object);
      if (error) {
        console.error('Type validation failed:', error);
      } else {
        console.log('Final extracted object:', object);

        if (object) {
          setMessages((prev) => {
            
            const streamingMsgIndex = prev.findIndex(msg => msg.id === 'streaming-assistant');
            
            if (streamingMsgIndex !== -1) {
              // Replace streaming message with final message
              const updated = prev.map((msg, index) => {
                if (index === streamingMsgIndex) {
                  return {
                    ...msg,
                    id: Date.now().toString(), // Give it a permanent ID
                    content: object.message ?? '',
                    events: object.events,
                    weather: object.weather,
                    traffic: object.traffic,
                    followUpSuggestions: object.followUpSuggestions,
                    timestamp: new Date(),
                    isStreaming: false,
                  };
                }
                return msg;
              });
              
              return updated;
            } else {
              // Fallback: streaming message not found, append new message
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: object.message ?? '',
                  events: object.events,
                  weather: object.weather,
                  traffic: object.traffic,
                  followUpSuggestions: object.followUpSuggestions,
                  timestamp: new Date(),
                  isStreaming: false,
                }
              ];
            }
          });
        }
        
        // Handle conversation ID and save conversation
        if (object && object.conversationId && object.conversationId !== currentConversationId) {
          setCurrentConversationId(object.conversationId);
          saveConversationId(object.conversationId);
          fetchConversations(); // Refresh conversations list
        }
        
        setIsWaitingForResponse(false);
        setShouldPushToTop(false);
        // // Gradually reset dynamic padding after response completes
        // setTimeout(() => {
        //   setDynamicPadding(0);
        // }, 1000);
      }
    },
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    console.log('🚀 Starting AI request with input:', input);
    console.log('📊 isProcessing before submit:', isLoading);
    
    const requestData = {
      messages: [{ role: 'user', content: input }],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userLocation: currentLocation || null,
      conversationId: currentConversationId,
    };
    
    submit(requestData);
    console.log('✅ Submit function called');
  };

//   // Update the streaming message in real-time
  useEffect(() => {
    if (aiResponse?.message && isLoading) {
      // Update the streaming assistant message in place
      setMessages((prev) => {
        
        const streamingMsgIndex = prev.findIndex(msg => msg.id === 'streaming-assistant');
        
        if (streamingMsgIndex === -1) {
          return prev; // Don't modify if streaming message not found
        }

        // Create new array with updated streaming message
        const updated = prev.map((msg, index) => {
          if (index === streamingMsgIndex) {
            return {
              ...msg,
              content: aiResponse.message || '',
              events: aiResponse.events || undefined,
              weather: aiResponse.weather || undefined,
              traffic: aiResponse.traffic || undefined,
              followUpSuggestions: aiResponse.followUpSuggestions?.filter((s: any) => typeof s === 'string' && s.length > 0) as string[] | undefined,
              isStreaming: true,
            };
          }
          return msg;
        });
        
        return updated;
      });
    }
  }, [aiResponse?.message, aiResponse?.events, aiResponse?.weather, aiResponse?.traffic, aiResponse?.followUpSuggestions, isLoading]);

  const handleStop = async () => {
    console.log('🛑 Stopping stream');
    stop();
    setIsWaitingForResponse(false);
    setShouldPushToTop(false);
  };

  const saveConversationId = async (conversationId: string) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`ai_current_conversation_${conversationId}_${userId}`, conversationId);
    } catch (error) {
      console.error('Failed to save current conversation ID:', error);
    }
  };

  const loadConversation = async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      // Get all keys that match our conversation pattern for this user
      const allKeys = await AsyncStorage.getAllKeys();
      const conversationKeys = allKeys.filter(key => key.startsWith(`ai_current_conversation_`) && key.endsWith(`_${userId}`));
      
      if (conversationKeys.length > 0) {
        // Use the first (most recent) conversation key
        const savedId = await AsyncStorage.getItem(conversationKeys[0]);
        if (savedId) {
          const res = await api.get(`/api/ai/conversations/${savedId}`);
          if (res.data.success) {
            setCurrentConversationId(res.data.data.conversationId);
            const msgs = res.data.data.messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string | Date }) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
            setMessages(msgs);
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Clean up any invalid conversation keys for this user
      const allKeys = await AsyncStorage.getAllKeys();
      const conversationKeys = allKeys.filter(key => key.startsWith(`ai_current_conversation_`) && key.endsWith(`_${userId}`));
      await AsyncStorage.multiRemove(conversationKeys);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchConversations = async () => {
    if (!userId) return;
    try {
      const response = await api.get('/api/ai/conversations', {
        params: { limit: 20 }
      });
      if (response.data.success) {
        setConversations(response.data.data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversationById = async (conversationId: string) => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/api/ai/conversations/${conversationId}`);
      if (res.data.success) {
        const conversationData = res.data.data;
        setCurrentConversationId(conversationData.conversationId);
        const formattedMessages = conversationData.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(formattedMessages);
        await saveConversationId(conversationData.conversationId);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await api.delete(`/api/ai/conversations/${conversationId}`);
      
      // Update conversations list
      setConversations(prev => prev.filter(conv => conv.conversationId !== conversationId));
      
      // If this is the current conversation, clear it
      if (conversationId === currentConversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
      
      // Clear from AsyncStorage if it's the current conversation
      if (userId) {
        const allKeys = await AsyncStorage.getAllKeys();
        const conversationKeys = allKeys.filter(key => key.startsWith(`ai_current_conversation_`) && key.endsWith(`_${userId}`));
        for (const key of conversationKeys) {
          const savedId = await AsyncStorage.getItem(key);
          if (savedId === conversationId) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const clearMessages = async () => {
    setMessages([]);
    setCurrentConversationId(null);
    if (userId) {
      // Remove all conversation keys for this user
      const allKeys = await AsyncStorage.getAllKeys();
      const conversationKeys = allKeys.filter(key => key.startsWith(`ai_current_conversation_`) && key.endsWith(`_${userId}`));
      await AsyncStorage.multiRemove(conversationKeys);
    }
    await fetchConversations(); // Refresh conversations list
  };

  const sendMessage = async (text: string) => {
    console.log('Sending message:', text);
    
    const userMsg: AiMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text.trim(), 
      timestamp: new Date() 
    };

    const streamingMessage: AiMessage = {
      id: 'streaming-assistant',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setLastUserMessage(text.trim());
    setIsWaitingForResponse(true);
    
    // Enable push to top behavior
    setShouldPushToTop(true);
    
    // Calculate padding to push message to top, accounting for keyboard
    const screenHeight = Dimensions.get('window').height;
    const topInset = insets.top;
    const headerHeight = 90; // Header height
    const availableHeight = screenHeight - headerHeight - topInset - 48;
    
    // Set padding to push content to very top of visible area
    setDynamicPadding(availableHeight - 100); // Leave 100px for the message itself
    
    try {
      // Build request data with current messages + new user message
      const requestData = {
        messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text }],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userLocation: currentLocation || null,
        conversationId: currentConversationId,
      };

      // Add both user message and streaming assistant message in one call
      setMessages((prev) => {
        const newMessages = [...prev, userMsg, streamingMessage];
        return newMessages;
      });
      
      // Reset AI message height tracker
      initialAIMessageHeight.current = 0;
      
      // Scroll to show the new message at the top
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 0);
      
      // Use the AI SDK's submit function
      submit(requestData);
      
      console.log('✅ Submit initiated successfully');
    } catch (error: any) {
      console.error('Streaming request failed:', error);
      
      setIsWaitingForResponse(false);
      setShouldPushToTop(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  useFocusEffect(
    useCallback(() => {
      loadConversation();
      fetchConversations();
    }, [])
  );

  useEffect(() => {
  if (messages.length && !hasScrolledInitially.current && flatListRef.current) {
    hasScrolledInitially.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }
}, [messages.length]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      
      // If not already pushing to top (no dynamic padding yet), scroll to end
      // This positions the last message above the keyboard
      if (!shouldPushToTop && dynamicPadding === 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [shouldPushToTop, dynamicPadding]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearMessages}>
              <Feather name="edit" size={20} color={themeColors.tint} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setIsSheetVisible(true)}>
            <Feather name="list" size={20} color={themeColors.tint} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, messages]);

  const handleAIMessageLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    
    if (initialAIMessageHeight.current === 0) {
      initialAIMessageHeight.current = height;
      return;
    }
    
    if (shouldPushToTop && dynamicPadding > 0) {
      const heightGrowth = Math.max(0, height - initialAIMessageHeight.current);
      const screenHeight = Dimensions.get('window').height;
      const topInset = insets.top;
      const headerHeight = 90;
      const availableHeight = screenHeight - headerHeight - topInset - 48;
      const initialPadding = availableHeight - 100;
      
      const newPadding = Math.max(0, initialPadding - heightGrowth);
      
      if (newPadding < dynamicPadding) {
        setDynamicPadding(newPadding);
      }
    }
  };

  // Pan responder to open conversation sheet with left swipe
  const swipePanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Require more deliberate horizontal movement and ensure it's primarily horizontal
      const horizontalMovement = Math.abs(gestureState.dx);
      const verticalMovement = Math.abs(gestureState.dy);
      const isHorizontalGesture = horizontalMovement > 50 && horizontalMovement > verticalMovement * 2;
      
      return isHorizontalGesture && !isSheetVisible && !isScrollingMessageIdeas;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { vx, dx } = gestureState;
      
      // Swipe left with sufficient velocity or distance
      if ((vx < -0.5 || dx < -100) && !isSheetVisible && !isScrollingMessageIdeas) {
        setIsSheetVisible(true);
      }
    },
  });

  const getCompletion = async (text: string) => {
    setInput(text)
    handleSubmit();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'black' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={{ flex: 1 }} {...swipePanResponder.panHandlers}>
          <FlashList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          return (
            <MessageBubble
              message={item} 
              colorScheme={colorScheme ?? 'dark'}
              isLoading={isLoading}
              aiResponse={aiResponse}
              lastUserMessage={lastUserMessage}
              onLayout={handleAIMessageLayout}
            />
          );
        }}
        contentContainerStyle={{ 
          paddingTop: 24, 
          paddingBottom: dynamicPadding,
          minHeight: '100%' 
        }}
      />

      {messages.length === 0 && (
        <>
          {/* Faded Kinovo AI text in center */}
          <View style={{
            position: 'absolute',
            top: '45%',
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: -50 }],
            zIndex: 0,
          }}>
            <Text style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: 'rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              letterSpacing: 2,
            }}>
              Kinovo AI
            </Text>
          </View>

          {/* Message Ideas at bottom */}
          <View>
            <MessageIdeas 
              onSelectCard={getCompletion}
              onScrollStart={() => setIsScrollingMessageIdeas(true)}
              onScrollEnd={() => setIsScrollingMessageIdeas(false)}
            />
          </View>
        </>
      )}

      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingTop: 4,
        paddingBottom: !keyboardVisible ? insets.bottom : 16, 
        backgroundColor: 'black' 
      }}>
        <View style={{ 
          flex: 1, 
          backgroundColor: '#1c1c1e', 
          borderRadius: 24, 
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingLeft: 16, 
          paddingRight: 8 
        }}>
          <TextInput
            style={{ flex: 1, color: 'white', fontSize: 16, paddingVertical: 12 }}
            placeholder="Ask anything"
            placeholderTextColor="#8e8e93"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity 
            onPress={isLoading ? handleStop : handleSend} 
            disabled={!isLoading && !input.trim()}
            style={{ 
              backgroundColor: themeColors.text, 
              borderRadius: 999, 
              padding: 6,
              opacity: (!isLoading && !input.trim()) ? 0.5 : 1
            }}
          >
            <Feather 
              name={isLoading ? 'square' : 'arrow-up'} 
              size={20} 
              color={themeColors.background} 
            />
          </TouchableOpacity>
        </View>
      </View>
        </View>

      {/* Conversation Sheet */}
      <ConversationSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onNewChat={clearMessages}
        colorScheme={colorScheme ?? 'dark'}
        conversations={conversations}
        onSelectConversation={loadConversationById}
        onDeleteConversation={deleteConversation}
        currentConversationId={currentConversationId}
      />
    </KeyboardAvoidingView>
  );
}