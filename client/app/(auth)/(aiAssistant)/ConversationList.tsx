import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { useNavigation, router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ConversationSummary = {
  _id: string;
  conversationId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

// Hook for managing conversation list
const useConversationList = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { userId } = useAuthSession();

  const loadConversations = async (showRefreshing = false) => {
    if (!userId) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.get('/api/ai/conversations?limit=50');
      if (response.data.success && response.data.data.conversations) {
        const conversationsWithSummary = response.data.data.conversations.map((conv: any) => ({
          ...conv,
          lastMessage: conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].content.substring(0, 100) + '...'
            : 'No messages yet',
        }));
        
        setConversations(conversationsWithSummary);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load conversations. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await api.delete(`/api/ai/conversations/${conversationId}`);
      setConversations(prev => prev.filter(conv => conv.conversationId !== conversationId));
      
      // Clear from AsyncStorage if it's the current conversation
      const savedConversationId = await AsyncStorage.getItem(`ai_current_conversation_${userId}`);
      if (savedConversationId === conversationId) {
        await AsyncStorage.removeItem(`ai_current_conversation_${userId}`);
      }

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    }
  };

  const clearAllConversations = async () => {
    try {
      await api.delete('/api/ai/conversations');
      setConversations([]);
      
      // Clear current conversation from AsyncStorage
      if (userId) {
        await AsyncStorage.removeItem(`ai_current_conversation_${userId}`);
      }
      
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      Alert.alert('Error', 'Failed to clear conversations. Please try again.');
    }
  };

  return {
    conversations,
    isLoading,
    isRefreshing,
    loadConversations,
    deleteConversation,
    clearAllConversations,
  };
};

export default function ConversationList() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userId } = useAuthSession();
  
  const {
    conversations,
    isLoading,
    isRefreshing,
    loadConversations,
    deleteConversation,
    clearAllConversations,
  } = useConversationList();

  // Load conversations when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  // Create header right button for clearing all conversations
  const headerRightButton = conversations.length > 0 ? (
    <TouchableOpacity 
      onPress={() => {
        Alert.alert(
          'Clear All Conversations',
          'Are you sure you want to delete all conversations? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear All', style: 'destructive', onPress: clearAllConversations },
          ]
        );
      }}
    >
      <Text style={{ color: themeColors.tint, fontSize: 16 }}>
        Clear All
      </Text>
    </TouchableOpacity>
  ) : null;

  // Set up header button
  React.useEffect(() => {
    navigation.setOptions({
      title: 'AI Conversations',
      headerRight: () => headerRightButton,
    });
  }, [navigation, headerRightButton]);

  const openConversation = async (conversationId: string) => {
    try {
      // Save as current conversation
      if (userId) {
        await AsyncStorage.setItem(`ai_current_conversation_${userId}`, conversationId);
      }
      
      // Navigate to AI assistant
      router.replace('/(auth)/(aiAssistant)/AiAssistant.v2');
    } catch (error) {
      console.error('Failed to open conversation:', error);
    }
  };

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(conversationId) },
      ]
    );
  };

  const renderConversation = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity
      style={{
        backgroundColor: themeColors.eventCardBackgroundColor,
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onPress={() => openConversation(item.conversationId)}
    >
      <View style={{ flex: 1 }}>
        <ThemedText 
          style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {item.title}
        </ThemedText>
        
        <ThemedText 
          style={{ 
            fontSize: 14, 
            opacity: 0.7,
            marginBottom: 8,
          }}
          numberOfLines={2}
        >
          {item.lastMessage}
        </ThemedText>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>
            {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      
      <TouchableOpacity
        style={{
          padding: 8,
          marginLeft: 12,
        }}
        onPress={() => handleDeleteConversation(item.conversationId, item.title)}
      >
        <Feather 
          name="trash-2" 
          size={20} 
          color={themeColors.text}
          style={{ opacity: 0.6 }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadConversations(true)}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          flexGrow: conversations.length === 0 ? 1 : 0,
        }}
        ListEmptyComponent={() => (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
          }}>
            {isLoading ? (
              <>
                <ThemedText style={{
                  fontSize: 16,
                  textAlign: 'center',
                  opacity: 0.7,
                }}>
                  Loading conversations...
                </ThemedText>
              </>
            ) : (
              <>
                <Text style={{
                  fontSize: 48,
                  marginBottom: 16,
                }}>💬</Text>
                <ThemedText style={{
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  No conversations yet
                </ThemedText>
                <ThemedText style={{
                  fontSize: 16,
                  textAlign: 'center',
                  opacity: 0.7,
                  lineHeight: 22,
                  marginBottom: 24,
                }}>
                  Start chatting with your AI assistant to see your conversation history here!
                </ThemedText>
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColors.mountainGreen,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => router.replace('/(auth)/(aiAssistant)/AiAssistant.v2')}
                >
                  <Feather 
                    name="message-circle" 
                    size={20} 
                    color={themeColors.text}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText style={{
                    color: themeColors.text,
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                    Start Chatting
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </ThemedView>
  );
}