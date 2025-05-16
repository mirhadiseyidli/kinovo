import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export default function AiAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const socket = useRef<WebSocket | null>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    socket.current = new WebSocket('ws://localhost:6000'); // Adjust this
    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant' as const,
              text: data.content,
            },
          ]);
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };

    return () => socket.current?.close();
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;

    const message = {
      id: Date.now().toString(),
      role: 'user' as const,
      text: input.trim(),
    };

    socket.current?.send(
      JSON.stringify({
        type: 'user_message',
        content: message.text,
      })
    );

    setMessages((prev) => [...prev, message]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // keyboardVerticalOffset={20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  flex: 1,
                  maxWidth: '75%',
                  marginVertical: 6,
                  padding: 12,
                  borderRadius: 12,
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: item.role === 'user' ? themeColors.aiBackgroundColor : '#F1F0F0',
                }}
              >
                <ThemedText style={{ fontSize: 16 }}>{item.text}</ThemedText>
              </View>
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom, 
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              paddingTop: 16,
              paddingBottom: insets.bottom,
              paddingHorizontal: 16,
              backgroundColor: themeColors.aiBackgroundColor,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              justifyContent: 'center',
            }}
          >
            <TextInput
              style={{
                flex: 1,
                // padding: 12,
                fontSize: 16,
                maxHeight: 120,
                textAlignVertical: 'top',
                color: themeColors.text
              }}
              multiline
              numberOfLines={4}
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              scrollEnabled
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: 'center',
                backgroundColor: themeColors.mountainGreen,
                justifyContent: 'center',
                alignSelf:'flex-end',
                marginLeft: 8
              }}
            >
              <Feather name="chevron-up" size={28} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
