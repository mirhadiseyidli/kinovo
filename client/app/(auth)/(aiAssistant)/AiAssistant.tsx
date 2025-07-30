import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
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

type MessageRole = 'user' | 'assistant';

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
};

type Conversation = {
  _id: string;
  conversationId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
};

// Hook for AI chat functionality with conversation persistence
const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { userId } = useAuthSession();
  const navigation = useNavigation();

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
          console.log(`📱 Loaded conversation history: ${conversation.conversationId} (${messagesWithDates.length} messages)`);
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
    console.log(content)
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
        console.log(`💾 Updated conversation ID: ${responseConversationId}`);
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
      
      // Simulate streaming by typing out the response character by character
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex < assistantContent.length) {
          const partialContent = assistantContent.slice(0, currentIndex + 1);
          
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
          
          currentIndex++;
        } else {
          clearInterval(streamInterval);
          setIsLoading(false);
        }
      }, 30); // Adjust speed as needed (30ms = ~33 chars per second)
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

  return {
    messages,
    sendMessage,
    isLoading,
    isLoadingHistory,
    currentConversationId,
    clearMessages,
    loadConversationHistory,
  };
};

export default function AiAssistant() {
  const [input, setInput] = useState('');
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    isLoadingHistory, 
    currentConversationId, 
    clearMessages, 
    loadConversationHistory 
  } = useAIChat();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const flatListRef = useRef<FlatList>(null);

  // Load conversation history when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadConversationHistory();
    }, [])
  );

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={{
        flex: 1,
        maxWidth: '85%',
        marginVertical: 6,
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 12,
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
        backgroundColor: item.role === 'user' 
          ? themeColors.eventCardBackgroundColor 
          : colorScheme === 'dark' ? '#2C2C2E' : '#F1F0F0',
      }}
    >
      <ThemedText style={{ 
        fontSize: 16,
        color: item.role === 'user' ? themeColors.text : (colorScheme === 'dark' ? '#FFFFFF' : '#000000')
      }}>
        {item.content}
      </ThemedText>
      <Text style={{
        fontSize: 12,
        color: colorScheme === 'dark' ? '#8E8E93' : '#8E8E93',
        marginTop: 4,
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
      }}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: 20,
              flexGrow: messages.length === 0 ? 1 : 0,
            }}
            ListEmptyComponent={() => {
              if (isLoadingHistory) {
                return (
                  <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
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
            }}
          />

          {/* Loading indicator */}
          {isLoading && (
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}>
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F1F0F0',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{ color: themeColors.text }}>•••</Text>
              </View>
            </View>
          )}

          {/* Input */}
          <View
            style={{
              flexDirection: 'row',
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              paddingHorizontal: 16,
              backgroundColor: themeColors.aiBackgroundColor,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              justifyContent: 'center',
              borderTopWidth: 1,
              borderTopColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
              minHeight: 80,
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
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                backgroundColor: input.trim() && !isLoading ? themeColors.mountainGreen : colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                justifyContent: 'center',
                alignSelf: 'flex-end',
              }}
              disabled={!input.trim() || isLoading}
            >
              <Feather 
                name="send" 
                size={20} 
                color={input.trim() && !isLoading ? themeColors.text : '#8E8E93'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}