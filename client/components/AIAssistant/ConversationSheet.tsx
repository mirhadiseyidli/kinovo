import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, PanResponder, ScrollView, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { AiConversation } from '@/types/allTypes';

interface ConversationSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onNewChat: () => void;
  colorScheme: 'light' | 'dark';
  onOpen?: () => void;
  conversations: AiConversation[];
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  currentConversationId: string | null;
}

export const ConversationSheet: React.FC<ConversationSheetProps> = ({
  isVisible,
  onClose,
  onNewChat,
  colorScheme,
  onOpen,
  conversations,
  onSelectConversation,
  onDeleteConversation,
  currentConversationId
}) => {
  const screenWidth = Dimensions.get('window').width;
  const sheetWidth = screenWidth * 0.8;
  const translateX = useSharedValue(screenWidth);
  const themeColors = Colors[colorScheme ?? 'dark'];
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteConversation(conversationId) },
      ]
    );
  };

  useEffect(() => {
    if (isVisible) {
      translateX.value = withTiming(screenWidth * 0.2, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateX.value = withTiming(screenWidth, {
        duration: 280,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isVisible]);

  // Pan responder for closing the sheet by swiping right
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return isVisible && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (isVisible && gestureState.dx > 0) {
        // Only allow dragging to the right when sheet is visible
        const newTranslateX = Math.min(
          screenWidth,
          (screenWidth * 0.2) + gestureState.dx
        );
        translateX.value = newTranslateX;
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (isVisible) {
        const velocity = gestureState.vx;
        const draggedDistance = gestureState.dx;
        
        // Close if dragged more than 30% of sheet width or fast swipe
        if (draggedDistance > sheetWidth * 0.3 || velocity > 0.5) {
          translateX.value = withTiming(screenWidth, { 
            duration: 280,
            easing: Easing.in(Easing.cubic),
          });
          // Clear any existing timeout and set new one
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(onClose, 280);
        } else {
          // Snap back to open position
          translateX.value = withTiming(screenWidth * 0.2, { 
            duration: 250,
            easing: Easing.out(Easing.quad),
          });
        }
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropOpacity = useSharedValue(0);
  
  useEffect(() => {
    backdropOpacity.value = withTiming(isVisible ? 0.5 : 0, {
      duration: isVisible ? 300 : 250,
    });
  }, [isVisible]);

  // Cleanup effect for when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any ongoing animations
      cancelAnimation(translateX);
      cancelAnimation(backdropOpacity);
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: isVisible ? 'auto' : 'none',
  }));

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            zIndex: 999,
          },
          backdropStyle,
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Side Sheet */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '80%',
            backgroundColor: themeColors.background,
            zIndex: 1000,
            paddingTop: 16,
            paddingHorizontal: 20,
          },
          animatedStyle,
        ]}
      >
        {/* Conversation History */}
        <View style={{ flex: 1 }}>
          {conversations.length > 0 ? (
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 16
              }}>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={{ 
                  color: themeColors.text, 
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  Recent Conversations
                </Text>
              </View>
              {conversations.map((conversation) => (
                <View
                  key={conversation.conversationId}
                  style={{
                    backgroundColor: currentConversationId === conversation.conversationId 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      onSelectConversation(conversation.conversationId);
                      onClose();
                    }}
                  >
                    <Text 
                      style={{ 
                        color: themeColors.text, 
                        fontSize: 16, 
                        fontWeight: '600',
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {conversation.title}
                    </Text>
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <Text style={{ 
                        color: themeColors.text, 
                        opacity: 0.6, 
                        fontSize: 12 
                      }}>
                        {conversation.messageCount} messages
                      </Text>
                      <Text style={{ 
                        color: themeColors.text, 
                        opacity: 0.6, 
                        fontSize: 12 
                      }}>
                        {new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      padding: 8,
                      marginLeft: 12,
                    }}
                    onPress={() => handleDeleteConversation(conversation.conversationId, conversation.title)}
                  >
                    <Feather 
                      name="trash-2" 
                      size={20} 
                      color={themeColors.text}
                      style={{ opacity: 0.6 }}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ 
              color: themeColors.text, 
              opacity: 0.6,
              fontSize: 16,
              textAlign: 'center',
              marginTop: 60 
            }}>
              No conversations yet
            </Text>
          )}
        </View>
      </Animated.View>
    </>
  );
};