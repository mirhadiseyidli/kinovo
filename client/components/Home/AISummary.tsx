import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Alert, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import * as SecureStore from 'expo-secure-store';
import { ThemedView } from '@/components/ThemedView';
import { OpenAI } from "openai";
import axios from 'axios';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import LinearGradient from 'react-native-linear-gradient';
import { User } from '@/types/allTypes';
import { useRouter } from 'expo-router';

const useGPTWebSocket = () => {
  const [summary, setSummary] = useState('');
  const [fullSummary, setFullSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { signOut } = useAuthSession();
  const [highlightedSentence, setHighlightedSentence] = useState('');
  
  const fetchUserData = async (): Promise<User | null> => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setUser(response.data);
      return response.data;
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
        logout();
      }
      return null;
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      await fetchUserData();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  const logout = () => {
    signOut();
  }

  useEffect(() => {
    const initWebSocket = async () => {
      const url = process.env.EXPO_PUBLIC_WEBSOCKET_CONNECTION_URL;
      if (!url) throw new Error('Missing WebSocket connection URL');
      
      setFullSummary('');
      setSummary('');
      setHighlightedSentence('');

      const currentUser = await fetchUserData();
      if (!currentUser?._id) return;

      const socket = new WebSocket(url);

      socket.onopen = () => {
        setIsLoading(true);
        if (currentUser._id) {
          socket.send(JSON.stringify({
            type: 'get_daily_insight',
            userId: currentUser._id,
          }));
        }
      };

      socket.onmessage = (event) => {
        if (event.data === '[DONE]') {
          setIsLoading(false);
          socket.close();
          return;
        }
        const data = JSON.parse(event.data);
        if (data.type === 'get_daily_insight') {
          setFullSummary((prev) => prev + data.content);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setIsLoading(false);
      };

      return () => {
        socket.close();
      };
    };

    initWebSocket();
  }, []);

  useEffect(() => {
    if (!fullSummary) return;

    // Extract first sentence and remaining text
    const match = fullSummary.match(/^(.*?[.!?])\s+/);
    const firstSentence = match ? match[1] : fullSummary;
    const remainingText = match ? fullSummary.slice(match[0].length) : '';

    let hIndex = 0;
    setHighlightedSentence('');
    setSummary('');

    const hInterval = setInterval(() => {
      setHighlightedSentence(firstSentence.slice(0, hIndex + 1));
      hIndex++;

      if (hIndex >= firstSentence.length) {
        clearInterval(hInterval);

        let index = 0;
        const interval = setInterval(() => {
          setSummary(remainingText.slice(0, index + 1));
          index++;

          if (index >= remainingText.length) {
            clearInterval(interval);
          }
        }, 50);
      }
    }, 50);

    return () => {
      clearInterval(hInterval);
    };
  }, [fullSummary]);

  return { summary, highlightedSentence, isLoading };
};

const AISummary = () => {
  const { signOut } = useAuthSession();
  const { summary, highlightedSentence, isLoading } = useGPTWebSocket();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [loadingText, setLoadingText] = useState('');
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingText('');
      return;
    }

    const fullText = 'Checking your daily schedule...';
    let index = 0;

    const interval = setInterval(() => {
      setLoadingText(fullText.slice(0, index + 1));
      index++;

      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 50); // Typing speed

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <ThemedView
      style={{
        flex: 1,
        width: '100%',
      }}
    >
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Your daily insights</ThemedText>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/(aiAssistant)/AiAssistant')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {colorScheme === 'dark' ? (
            <Image 
              source={require('@/assets/aiAssistantWhite.gif')}
              style={{ width: 18, height: 18, marginRight: 6, marginTop: 0 }}
            /> ) : (
            <Image 
              source={require('@/assets/aiAssistant.gif')}
              style={{ width: 18, height: 18, marginRight: 10 }}
            /> )
          }
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>Assistant</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>
      <View
        style={{
          flex: 1,
          width: '100%',
          padding: 16,
          borderRadius: 12, // Slightly more rounded corners
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          minHeight: 120,
          backgroundColor: themeColors.background,
          flexWrap: 'wrap'
        }}
      >
        <LinearGradient
          colors={[themeColors.cardColorsGradientOne, themeColors.cardColorsGradientTwo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 12,
            opacity: 0.9, // Slight transparency for a sleeker look
          }}
        />
        {isLoading ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {colorScheme === 'dark' ? (
                <Image 
                  source={require('@/assets/aiAssistantWhite.gif')}
                  style={{ width: 24, height: 24, marginRight: 10, marginTop: -10 }}
                /> ) : (
                <Image 
                  source={require('@/assets/aiAssistant.gif')}
                  style={{ width: 24, height: 24, marginRight: 10 }}
                /> )
              }
              <Text style={{ fontSize: 16, color: themeColors.text, marginBottom: 10 }}>
                {loadingText}
              </Text>
            </View>
            <Animated.View
              style={{
                width: '100%',
                height: 16,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: themeColors.inputBackgroundColor,
                marginTop: 10,
              }}
            >
              <Animated.View
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  left: 0,
                  transform: [
                    {
                      translateX: loadingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-300, 300], // Ensures animation moves fully across
                      }),
                    },
                  ],
                }}
              >
                <LinearGradient
                  colors={[themeColors.inputBackgroundColor, themeColors.mountainGreen, themeColors.inputBackgroundColor]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            </Animated.View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {colorScheme === 'dark' ? (
                <Image 
                  source={require('@/assets/aiAssistantWhite.gif')}
                  style={{ width: 24, height: 24, marginRight: 10, marginTop: -10 }}
                /> ) : (
                <Image 
                  source={require('@/assets/aiAssistant.gif')}
                  style={{ width: 24, height: 24, marginRight: 10 }}
                /> )
              }
              <Text style={{ flexShrink: 1, flexWrap: 'wrap', fontSize: 16, color: themeColors.text, fontWeight: 'bold', marginBottom: 8 }}>
                {highlightedSentence}
              </Text>
            </View>
            <Text style={{ flexShrink: 1, flexWrap: 'wrap', fontSize: 16, color: themeColors.text }}>
              {summary}
            </Text>
          </>
        )}
      </View>
    </ThemedView>
  );
};

export default AISummary;