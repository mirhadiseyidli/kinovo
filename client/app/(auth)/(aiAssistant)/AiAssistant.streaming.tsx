// // AI Assistant with Real-time Streaming and Structured Data Support
// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   KeyboardAvoidingView,
//   Platform,
//   Keyboard,
// } from 'react-native';
// import Animated, { FadeIn } from 'react-native-reanimated';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { FlashList, FlashListRef } from '@shopify/flash-list';
// import { Feather } from '@expo/vector-icons';
// import { experimental_useObject as useObject } from '@ai-sdk/react';
// import { z } from 'zod';
// import { useAuthSession } from '@/components/Auth/AuthProvider';
// import { useColorScheme } from '@/hooks/useColorScheme';
// import { Colors } from '@/constants/Colors';
// import { useLocation } from '@/context/LocationContext';
// import { useNavigation, router } from 'expo-router';
// import { useFocusEffect } from '@react-navigation/native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MessageIdeas from '@/components/AIAssistant/MessageIdeas';
// import PastEvent from '@/components/Home/PastEvent';
// import { WeatherCard } from '@/components/Home/WeatherCard';
// import { TrafficCard } from '@/components/Home/TrafficCard';
// import { getWeatherGradient, getWeatherConditionFromDescription } from '@/constants/WeatherConditions';
// import { fetch } from 'expo/fetch';
// import * as SecureStore from 'expo-secure-store';

// // Schema matching the backend agentResponseSchema
// const agentResponseSchema = z.object({
//   message: z.string().describe('The main response message to show to the user'),
//   events: z.array(z.object({
//     _id: z.string(),
//     title: z.string(),
//     start_time: z.string(),
//     end_time: z.string().optional(),
//     location: z.object({
//       text: z.string(),
//       coordinates: z.object({
//         lat: z.number(),
//         lng: z.number(),
//       }).optional(),
//     }).optional(),
//     category: z.string().optional(),
//     description: z.string().optional(),
//     visibility: z.string().optional(),
//   })).optional(),
//   weather: z.object({
//     temperature: z.number(),
//     condition: z.string(),
//     conditionCode: z.string().optional(),
//     humidity: z.number().optional(),
//     windSpeed: z.number().optional(),
//     emoji: z.string().optional(),
//     recommendation: z.string().optional(),
//     coordinates: z.object({
//       lat: z.number(),
//       lng: z.number(),
//     }).optional(),
//   }).optional(),
//   traffic: z.object({
//     duration: z.string(),
//     distance: z.string(),
//     traffic: z.string().optional(),
//     condition: z.string().optional(),
//     emoji: z.string().optional(),
//     recommendation: z.string().optional(),
//     coordinates: z.object({
//       from: z.object({
//         lat: z.number(),
//         lng: z.number(),
//       }),
//       to: z.object({
//         lat: z.number(),
//         lng: z.number(),
//       }),
//     }).optional(),
//     mapSnapshotUrl: z.object({
//       light: z.string(),
//       dark: z.string(),
//     }).nullable().optional(),
//     locationName: z.string().optional(),
//   }).optional(),
//   actionTaken: z.string().optional(),
//   followUpSuggestions: z.array(z.string()).optional(),
// });

// interface Message {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: Date;
//   // Structured data attachments
//   eventData?: any;
//   eventsData?: any[]; // Support multiple events
//   weatherData?: any;
//   trafficData?: any;
//   isStreaming?: boolean;
// }

// interface MessageBubbleProps {
//   message: Message;
//   colorScheme: 'light' | 'dark';
// }

// // Custom fetch with token refresh logic
// const createAuthFetch = () => {
//   return async (url: string, options: RequestInit = {}) => {
//     // Get current token
//     let token = await SecureStore.getItemAsync('accessToken');
    
//     // Add token to headers
//     const headers = new Headers(options.headers);
//     if (token) {
//       headers.set('Authorization', `Bearer ${token}`);
//     }
    
//     // Make initial request
//     let response = await fetch(url, {
//       ...options,
//       headers,
//     });
    
//     // If token expired, try to refresh
//     if (response.status === 401) {
//       try {
//         console.log('🔄 Token expired, refreshing...');
        
//         // Get refresh token
//         const refreshToken = await SecureStore.getItemAsync('refreshToken');
//         if (!refreshToken) {
//           throw new Error('No refresh token available');
//         }
        
//         // Refresh access token
//         const refreshResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`, {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${refreshToken}`,
//             'Content-Type': 'application/json',
//           },
//         });
        
//         if (!refreshResponse.ok) {
//           throw new Error('Token refresh failed');
//         }
        
//         const refreshData = await refreshResponse.json();
//         const newToken = refreshData.accessToken;
        
//         // Store new token
//         await SecureStore.setItemAsync('accessToken', newToken);
        
//         // Retry original request with new token
//         headers.set('Authorization', `Bearer ${newToken}`);
//         response = await fetch(url, {
//           ...options,
//           headers,
//         });
        
//         console.log('✅ Token refreshed and request retried');
        
//       } catch (error) {
//         console.error('❌ Token refresh failed:', error);
//         // If refresh fails, redirect to login
//         router.replace('/login');
//         throw error;
//       }
//     }
    
//     return response;
//   };
// };

// const StreamingText = ({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
//   // Split by newlines first to preserve line breaks
//   const lines = text.split('\n');
//   let wordIndex = 0;
  
//   return (
//     <View>
//       {lines.map((line, lineIndex) => (
//         <View key={`line-${lineIndex}`} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
//           {line.split(' ').map((word, index) => {
//             const currentWordIndex = wordIndex++;
//             return (
//               <Animated.Text
//                 key={`${lineIndex}-${index}`}
//                 entering={FadeIn.duration(300).delay(currentWordIndex * 50)}
//                 style={{ fontSize: 16, color: 'white', lineHeight: 22 }}
//               >
//                 {word}{index < line.split(' ').length - 1 ? ' ' : ''}
//               </Animated.Text>
//             );
//           })}
//           {lineIndex < lines.length - 1 && <Text>{'\n'}</Text>}
//         </View>
//       ))}
//       {isStreaming && (
//         <Text style={{ fontSize: 16, color: 'white', lineHeight: 22, opacity: 0.5 }}>▊</Text>
//       )}
//     </View>
//   );
// };

// // Component for rendering message with structured data
// const MessageBubble = ({ message, colorScheme }: MessageBubbleProps) => {
//   // Content is already cleaned on the backend, no need for frontend processing
//   const cleanContent = message.content;

//   return (
//     <>
//       {/* Text Message - Keep in original container */}
//       <View
//         style={{
//           alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
//           alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
//           marginBottom: message.role === 'assistant' && (message.eventsData?.length || message.eventData || message.weatherData || message.trafficData) ? 8 : 12,
//           marginHorizontal: 16,
//           maxWidth: message.role === 'user' ? '85%' : undefined,
//         }}
//       >
//         <View
//           style={{
//             backgroundColor: message.role === 'user' ? '#2c2c2e' : 'transparent',
//             borderRadius: 16,
//             padding: 12,
//             alignSelf: message.role === 'user' ? 'stretch' : 'flex-start',
//           }}
//         >
//           {message.role === 'user' ? (
//             <Text style={{ fontSize: 16, color: 'white', lineHeight: 22 }}>
//               {message.content}
//             </Text>
//           ) : (
//             <StreamingText 
//               text={cleanContent} 
//               isStreaming={message.isStreaming || false}
//             />
//           )}
//         </View>
//       </View>

//       {/* Event Cards - Full width container */}
//       {message.role === 'assistant' && message.eventsData && message.eventsData.length > 0 && (
//         <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
//           {message.eventsData.map((event, index) => (
//             <View key={event._id || index} style={{ marginBottom: index < (message.eventsData?.length ?? 0) - 1 ? 8 : 0 }}>
//               <PastEvent event={event} loading={false} />
//             </View>
//           ))}
//         </View>
//       )}
      
//       {/* Single Event Card (backwards compatibility) - Full width */}
//       {message.role === 'assistant' && !message.eventsData && message.eventData && (
//         <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
//           <PastEvent event={message.eventData} loading={false} />
//         </View>
//       )}

//       {/* Weather and Traffic Cards - Full width */}
//       {message.role === 'assistant' && (message.weatherData || message.trafficData) && (
//         <View style={{ 
//           flexDirection: 'row', 
//           justifyContent: 'space-between',
//           gap: 8,
//           paddingHorizontal: 16,
//           marginBottom: 12
//         }}>
//           {message.weatherData && (
//             <WeatherCard 
//               weather={{
//                 temperature: `${message.weatherData.temperature}°F`,
//                 condition: message.weatherData.condition || 'Current conditions',
//                 emoji: message.weatherData.emoji || '🌤️',
//                 recommendation: message.weatherData.recommendation || `Currently ${message.weatherData.temperature}°F with ${message.weatherData.condition}`
//               }}
//               backgroundColors={(() => {
//                 const weatherCondition = getWeatherConditionFromDescription(message.weatherData.condition);
//                 if (weatherCondition) {
//                   return weatherCondition.gradients[colorScheme === 'dark' ? 'dark' : 'light'];
//                 }
//                 return getWeatherGradient(message.weatherData.conditionCode || 'CLR', colorScheme === 'dark' ? 'dark' : 'light');
//               })()}
//               coordinates={message.weatherData.coordinates || message.eventData?.location?.coordinates}
//             />
//           )}
          
//           {message.trafficData && (
//             <TrafficCard 
//               traffic={{
//                 duration: message.trafficData.duration,
//                 condition: message.trafficData.condition || 'Current traffic conditions',
//                 emoji: message.trafficData.emoji || '🚗',
//                 recommendation: message.trafficData.recommendation || `${message.trafficData.traffic ? `Traffic: ${message.trafficData.traffic}` : 'Check current conditions'}`
//               }}
//               mapImage={{ 
//                 uri: message.trafficData.mapSnapshotUrl
//                   ? (colorScheme === 'dark' ? message.trafficData.mapSnapshotUrl.dark : message.trafficData.mapSnapshotUrl.light)
//                   : 'https://cdn.kinovo.app/insight-map/map-dark.jpg' 
//               }}
//               coordinates={message.trafficData.coordinates?.to}
//               locationName={message.trafficData.locationName}
//             />
//           )}
//         </View>
//       )}
//     </>
//   );
// };

// export default function AIAssistantStreaming() {
//   const [input, setInput] = useState<string>('');
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
//   const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
//   const flatListRef = useRef<FlashListRef<Message> | null>(null);
//   const { userId, accessToken } = useAuthSession();
//   const { currentLocation } = useLocation();
//   const navigation = useNavigation();
//   const insets = useSafeAreaInsets();
//   const colorScheme = useColorScheme();
//   const themeColors = Colors[colorScheme ?? 'dark'];

//   // Create auth fetch instance
//   const authFetch = createAuthFetch();

//   // Use the AI SDK's useObject hook for streaming
//   const { object, submit, isLoading, stop } = useObject({
//     api: `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/ai/agent/stream`,
//     schema: agentResponseSchema,
//     fetch: authFetch as unknown as typeof globalThis.fetch, 
//     onError: (error) => {
//       console.error('=== useObject ERROR ===');
//       console.error('useObject error:', error);
//     },
//     onFinish: ({ object, error }) => {
//       console.log('=== useObject FINISH ===');
//       if (error) {
//         console.error('Type validation failed:', error);
//         return;
//       }
//       console.log('Final extracted object:', object);
      
//       // Only finalize if it completed naturally (not stopped manually)
//       // Check if the streaming message was already finalized by handleStop
//       const streamingMsg = messages.find(msg => msg.id === 'streaming-assistant');
//       const wasManualStop = messages.some(msg => msg.content.includes('[stopped]'));
      
//       if (object && !wasManualStop && streamingMsg) {
//         handleStreamComplete(object);
//       }
//     },
//   });

//   // Update the streaming message in real-time
//   useEffect(() => {
//     if (object?.message && isLoading) {
//       console.log('Streaming message so far:', object.message);
      
//       // Update the streaming assistant message in place
//       setMessages((prev) => {
//         const updated = [...prev];
//         const streamingMsgIndex = updated.findIndex(msg => msg.id === 'streaming-assistant');
        
//         if (streamingMsgIndex !== -1) {
//           updated[streamingMsgIndex] = {
//             ...updated[streamingMsgIndex],
//             content: object.message || '',
//             eventsData: object.events || undefined,
//             weatherData: object.weather || undefined,
//             trafficData: object.traffic || undefined,
//             isStreaming: true,
//           };
//         }
        
//         return updated;
//       });
//     }
//   }, [object?.message, object?.events, object?.weather, object?.traffic, isLoading]);

//   // Handle when streaming completes - finalize the streaming message
//   const handleStreamComplete = (finalObject: any) => {
//     if (finalObject?.message) {
//       // Update the streaming message to be final
//       setMessages((prev) => {
//         const updated = [...prev];
//         const streamingMsgIndex = updated.findIndex(msg => msg.id === 'streaming-assistant');
        
//         if (streamingMsgIndex !== -1) {
//           updated[streamingMsgIndex] = {
//             ...updated[streamingMsgIndex],
//             id: `assistant-${Date.now()}`, // Give it a permanent ID
//             content: finalObject.message,
//             isStreaming: false,
//             eventsData: finalObject.events || undefined,
//             weatherData: finalObject.weather || undefined,
//             trafficData: finalObject.traffic || undefined,
//           };
//         }
        
//         return updated;
//       });
//     }
//   };

//   // Handle stop action - finalize the streaming message at stop point
//   const handleStop = () => {
//     console.log('🛑 Stopping stream');
    
//     // Finalize the streaming message with [stopped] marker
//     setMessages((prev) => {
//       const updated = [...prev];
//       const streamingMsgIndex = updated.findIndex(msg => msg.id === 'streaming-assistant');
      
//       if (streamingMsgIndex !== -1) {
//         updated[streamingMsgIndex] = {
//           ...updated[streamingMsgIndex],
//           id: `assistant-${Date.now()}`, // Give it a permanent ID
//           content: (object?.message || updated[streamingMsgIndex].content) + ' [stopped]',
//           isStreaming: false,
//           eventsData: object?.events || undefined,
//           weatherData: object?.weather || undefined,
//           trafficData: object?.traffic || undefined,
//         };
//       }
      
//       return updated;
//     });
    
//     stop();
//   };

//   // const saveConversationId = async (id: string) => {
//   //   if (userId) await AsyncStorage.setItem(`ai_current_conversation_${userId}`, id);
//   // };

//   const loadConversation = async () => {
//     if (!userId || !accessToken?.current) return;
//     try {
//       const savedId = await AsyncStorage.getItem(`ai_current_conversation_${userId}`);
//       if (savedId) {
//         const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/ai/conversations/${savedId}`, {
//           headers: { 'Authorization': `Bearer ${accessToken.current}` }
//         });
//         if (response.ok) {
//           const data = await response.json();
//           setCurrentConversationId(data.data.conversationId);
//           const msgs = data.data.messages.map((msg: any) => ({ 
//             ...msg, 
//             timestamp: new Date(msg.timestamp),
//             isStreaming: false 
//           }));
//           setMessages(msgs);
//         }
//       }
//     } catch (err) {
//       console.error('Error loading conversation:', err);
//     }
//   };

//   const clearMessages = async () => {
//     setMessages([]);
//     setCurrentConversationId(null);
//     if (userId) await AsyncStorage.removeItem(`ai_current_conversation_${userId}`);
//   };

//   const sendMessage = async (text: string) => {
//     if (!accessToken?.current) {
//       console.error('No access token available');
//       return;
//     }

//     console.log('Sending message:', text);

//     const userMsg: Message = { 
//       id: Date.now().toString(), 
//       role: 'user', 
//       content: text.trim(), 
//       timestamp: new Date() 
//     };
    
//     // Add streaming assistant message immediately
//     const streamingAssistantMsg: Message = {
//       id: 'streaming-assistant',
//       role: 'assistant',
//       content: '',
//       timestamp: new Date(),
//       isStreaming: true,
//     };
    
//     setMessages((prev) => [...prev, userMsg, streamingAssistantMsg]);

//     try {
//       const requestData = {
//         messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text }],
//         timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//         userLocation: currentLocation || null,
//         conversationId: currentConversationId,
//       };
      
//       console.log('📤 Submitting request data:', requestData);
      
//       // Use the AI SDK's submit function
//       submit(requestData);
      
//       console.log('✅ Submit completed successfully');
//     } catch (error: any) {
//       console.error('Streaming request failed:', error);
      
//       // Update the assistant message with error
//       setMessages((prev) => {
//         const updated = [...prev];
//         const lastMsg = updated[updated.length - 1];
//         if (lastMsg && lastMsg.role === 'assistant') {
//           lastMsg.content = 'Sorry, I encountered an error processing your request. Please try again.';
//           lastMsg.isStreaming = false;
//         }
//         return updated;
//       });
//     }
//   };

//   const handleSend = () => {
//     if (!input.trim() || isLoading) return;
//     const text = input;
//     setInput('');
//     sendMessage(text);
//   };

//   const getCompletion = async (text: string) => {
//     sendMessage(text);
//   };

//   useFocusEffect(
//     useCallback(() => {
//       loadConversation();
//     }, [])
//   );

//   useEffect(() => {
//     if (messages.length && flatListRef.current) {
//       requestAnimationFrame(() => {
//         flatListRef.current?.scrollToEnd({ animated: false });
//       });
//     }
//   }, [messages.length]);

//   useEffect(() => {
//     const show = Keyboard.addListener('keyboardWillShow', () => {
//       setKeyboardVisible(true);
//       setTimeout(() => {
//         flatListRef.current?.scrollToEnd({ animated: true });
//       }, 100);
//     });
//     const hide = Keyboard.addListener('keyboardWillHide', () => {
//       setKeyboardVisible(false);
//     });
//     return () => { show.remove(); hide.remove(); };
//   }, []);

//   useEffect(() => {
//     navigation.setOptions({
//       headerRight: () => (
//         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
//           <TouchableOpacity onPress={() => router.push('/(auth)/(aiAssistant)/ConversationList')}>
//             <Feather name="list" size={20} color={themeColors.tint} />
//           </TouchableOpacity>
//           <TouchableOpacity onPress={clearMessages}>
//             <Text style={{ color: themeColors.tint, fontSize: 16 }}>Clear</Text>
//           </TouchableOpacity>
//         </View>
//       ),
//     });
//   }, [navigation, clearMessages, themeColors.tint]);

//   // Messages now include the streaming message in real-time
//   const displayMessages = messages;

//   return (
//     <KeyboardAvoidingView 
//       style={{ flex: 1, backgroundColor: 'black' }} 
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
//       keyboardVerticalOffset={90}
//     >
//       <FlashList
//         ref={flatListRef}
//         data={displayMessages}
//         keyExtractor={(item) => item.id}
//         showsVerticalScrollIndicator={false}
//         // renderItem={({ item }) => (
//         //   <MessageBubble 
//         //     message={item} 
//         //     colorScheme={colorScheme ?? 'dark'}
//         //   />
//         // )}

//         renderItem={({ item }) => (
//           <MessageBubble message={item} colorScheme={colorScheme ?? 'dark'} />
//         )}
//         ListFooterComponent={null}
//         contentContainerStyle={{ 
//           paddingTop: 24, 
//           paddingBottom: 0
//         }}
//       />

//       {messages.length === 0 && (
//         <>
//           <View style={{
//             position: 'absolute',
//             top: '45%',
//             left: 0,
//             right: 0,
//             alignItems: 'center',
//             justifyContent: 'center',
//             transform: [{ translateY: -50 }],
//             zIndex: 0,
//           }}>
//             <Text style={{
//               fontSize: 48,
//               fontWeight: 'bold',
//               color: 'rgba(255, 255, 255, 0.1)',
//               textAlign: 'center',
//               letterSpacing: 2,
//             }}>
//               Kinovo AI
//             </Text>
//           </View>

//           <View>
//             <MessageIdeas onSelectCard={getCompletion} />
//           </View>
//         </>
//       )}

//       <View style={{ 
//         flexDirection: 'row', 
//         alignItems: 'center', 
//         paddingHorizontal: 12, 
//         paddingBottom: !keyboardVisible ? insets.bottom : 16, 
//         backgroundColor: 'black' 
//       }}>
//         <View style={{ 
//           flex: 1, 
//           backgroundColor: '#1c1c1e', 
//           borderRadius: 24, 
//           flexDirection: 'row', 
//           alignItems: 'center', 
//           paddingLeft: 16, 
//           paddingRight: 8 
//         }}>
//           <TextInput
//             style={{ flex: 1, color: 'white', fontSize: 16, paddingVertical: 12 }}
//             placeholder="Ask anything"
//             placeholderTextColor="#8e8e93"
//             value={input}
//             onChangeText={setInput}
//             onSubmitEditing={handleSend}
//             multiline
//             editable={!isLoading}
//           />
//           <TouchableOpacity 
//             onPress={isLoading ? handleStop : handleSend} 
//             disabled={!isLoading && !input.trim()}
//             style={{ 
//               backgroundColor: themeColors.text, 
//               borderRadius: 999, 
//               padding: 6,
//               opacity: (!isLoading && !input.trim()) ? 0.5 : 1
//             }}
//           >
//             <Feather 
//               name={isLoading ? 'square' : 'arrow-up'} 
//               size={20} 
//               color={themeColors.background} 
//             />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }


import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, StyleSheet, TextInput } from "react-native";
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from "zod";
import { useEffect, useState } from "react";
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { fetch } from 'expo/fetch';

// Schema matching our backend agentResponseSchema
const agentResponseSchema = z.object({
  message: z.string().describe('The main response message to show to the user'),
  events: z.array(z.object({
    _id: z.string(),
    title: z.string(),
    start_time: z.string(),
    end_time: z.string().optional(),
    location: z.object({
      text: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    visibility: z.string().optional(),
  })).optional(),
  weather: z.object({
    temperature: z.number(),
    condition: z.string(),
    conditionCode: z.string().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    emoji: z.string().optional(),
    recommendation: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  traffic: z.object({
    duration: z.string(),
    distance: z.string(),
    traffic: z.string().optional(),
    condition: z.string().optional(),
    emoji: z.string().optional(),
    recommendation: z.string().optional(),
    coordinates: z.object({
      from: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      to: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }).optional(),
    mapSnapshotUrl: z.object({
      light: z.string(),
      dark: z.string(),
    }).nullable().optional(),
    locationName: z.string().optional(),
  }).optional(),
  actionTaken: z.string().optional(),
  followUpSuggestions: z.array(z.string()).optional(),
});

// Custom fetch with token refresh logic
const createAuthFetch = () => {
  return async (url: string, options: RequestInit = {}) => {
    // Get current token
    let token = await SecureStore.getItemAsync('accessToken');
    
    // Add token to headers
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Make initial request
    let response = await fetch(url, {
      ...options,
      headers,
      body: options.body !== null ? options.body : undefined,
      signal: options.signal !== null ? options.signal : undefined,
    });
    
    // If token expired, try to refresh
    if (response.status === 401) {
      try {
        console.log('🔄 Token expired, refreshing...');
        
        // Get refresh token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Refresh access token
        const refreshResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!refreshResponse.ok) {
          throw new Error('Token refresh failed');
        }
        
        const refreshData = await refreshResponse.json();
        const newToken = refreshData.accessToken;
        
        // Store new token
        await SecureStore.setItemAsync('accessToken', newToken);
        
        // Retry original request with new token
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers,
          body: options.body !== null ? options.body : undefined,
          signal: options.signal !== null ? options.signal : undefined,
        });
        
        console.log('✅ Token refreshed and request retried');
        
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        // If refresh fails, redirect to login
        router.replace('/login');
        throw error;
      }
    }
    
    return response;
  };
};

export default function AIAssistantTest() {
  const [input, setInput] = useState('');
  const [token, setToken] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const getToken = async () => {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      setToken(accessToken);
    }
    getToken();
  }, [])

  // Custom fetch wrapper that captures the AbortController
  // const customFetch = (url: string, options: RequestInit = {}) => {
  //   // Create a new AbortController for this request
  //   const controller = new AbortController();
  //   setAbortController(controller);
    
  //   console.log('🚀 Creating new fetch request with AbortController');
    
  //   // If useObject provides its own signal, we need to listen to it as well
  //   if (options.signal) {
  //     console.log('📍 useObject provided its own signal');
      
  //     // When useObject's signal aborts, also abort our controller
  //     options.signal.addEventListener('abort', () => {
  //       console.log('📍 useObject signal aborted - aborting our controller too');
  //       controller.abort();
  //     });
      
  //     // When our controller aborts, we still use our signal for the fetch
  //     // This ensures the abort reaches the server
  //   }
    
  //   // Always use our controller's signal for the fetch
  //   // This ensures we have full control over aborting
  //   return fetch(url, {
  //     ...options,
  //     signal: controller.signal,
  //     body: options.body !== null ? options.body : undefined,
  //   }).catch((error) => {
  //     if (error.name === 'AbortError') {
  //       console.log('✅ Request was successfully aborted');
  //       setAbortController(null);
  //     }
  //     throw error;
  //   });
  // };

  const { object: aiResponse, submit, isLoading: isProcessing, stop } = useObject({
    api: `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/ai/agent/stream`,
    schema: agentResponseSchema,
    headers: {'Accept': 'text/event-stream', 'Authorization': `Bearer ${token}`},
    fetch: fetch as unknown as typeof globalThis.fetch,
    onError: (error) => {
      console.error('=== useObject ERROR ===');
      console.error('useObject error:', error);
      setAbortController(null); // Clear the controller on error
    },
    onFinish: ({ object, error }) => {
      console.log('=== useObject FINISH ===');
      console.log('isProcessing during finish:', isProcessing);
      if (error) {
        console.error('Type validation failed:', error);
      } else {
        console.log('Final extracted object:', object);
      }
      setAbortController(null); // Clear the controller when done
    },
  });

  // Custom abort function that properly aborts the fetch request
  const handleAbort = () => {
    console.log('🔴 handleAbort called')
    
    // First call stop() from useObject to properly clean up the stream
    console.log('📍 Calling stop() from useObject');
    stop();
    
    // Then abort our controller if it exists
    if (abortController) {
      console.log('🛑 Aborting our fetch controller...');
      abortController.abort();
      setAbortController(null);
    } else {
      console.log('⚠️ No active controller to abort');
    }
  };

  // useEffect(() => {
  //   if (aiResponse) {
  //     console.log('🔄 Streaming update:', {
  //       messageLength: aiResponse.message?.length || 0,
  //       hasEvents: !!aiResponse.events?.length,
  //       hasWeather: !!aiResponse.weather,
  //       hasTraffic: !!aiResponse.traffic,
  //       isProcessing
  //     });
  //   }
  // }, [aiResponse, isProcessing]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    console.log('🚀 Starting AI request with input:', input);
    console.log('📊 isProcessing before submit:', isProcessing);
    
    const requestData = {
      messages: [{ role: 'user', content: input }],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userLocation: null,
      conversationId: null,
    };
    
    submit(requestData);
    console.log('✅ Submit function called');
  };

  console.log('render')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant Test</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask the AI assistant..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isProcessing}
          />
          <TouchableOpacity 
            style={[styles.button]} 
            onPress={handleSubmit}
            // disabled={!isProcessing && !input.trim()}
          >
            <Text style={styles.buttonText}>
              {'Send'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button]} 
            onPress={handleAbort}
            disabled={!isProcessing}
          >
            <Text style={styles.buttonText}>
              {'Stop'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {aiResponse ? (
          <View style={styles.responseContainer}>
            {/* Main Message */}
            {aiResponse.message && (
              <View style={styles.messageCard}>
                <Text style={styles.messageTitle}>Response:</Text>
                <Text style={styles.messageText}>{aiResponse.message}</Text>
                {/* {isProcessing && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Text style={styles.streamingIndicator}>▊</Text>
                    <Text style={styles.streamingText}> streaming...</Text>
                  </View>
                )} */}
              </View>
            )}
            
            {/* Events */}
            {aiResponse.events && aiResponse.events.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Events ({aiResponse.events.length}):</Text>
                {aiResponse.events.map((event, index) => (
                  <View key={event?._id || index} style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{event?.title || 'Untitled Event'}</Text>
                    <Text style={styles.eventInfo}>Start: {event?.start_time ? new Date(event.start_time).toLocaleString() : 'TBD'}</Text>
                    {event?.end_time && (
                      <Text style={styles.eventInfo}>End: {new Date(event.end_time).toLocaleString()}</Text>
                    )}
                    {event?.location && (
                      <Text style={styles.eventInfo}>Location: {event.location.text}</Text>
                    )}
                    {event?.category && (
                      <Text style={styles.eventInfo}>Category: {event.category}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Weather */}
            {aiResponse.weather && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Weather:</Text>
                <View style={styles.weatherCard}>
                  <Text style={styles.weatherText}>
                    {aiResponse.weather.emoji} {aiResponse.weather.temperature}°F - {aiResponse.weather.condition}
                  </Text>
                  {aiResponse.weather.recommendation && (
                    <Text style={styles.weatherRecommendation}>{aiResponse.weather.recommendation}</Text>
                  )}
                </View>
              </View>
            )}
            
            {/* Traffic */}
            {aiResponse.traffic && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Traffic:</Text>
                <View style={styles.trafficCard}>
                  <Text style={styles.trafficText}>
                    {aiResponse.traffic.emoji} {aiResponse.traffic.duration} ({aiResponse.traffic.distance})
                  </Text>
                  {aiResponse.traffic.recommendation && (
                    <Text style={styles.trafficRecommendation}>{aiResponse.traffic.recommendation}</Text>
                  )}
                </View>
              </View>
            )}
            
            {/* Action Taken */}
            {aiResponse.actionTaken && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Action Taken:</Text>
                <Text style={styles.actionText}>{aiResponse.actionTaken}</Text>
              </View>
            )}
            
            {/* Follow-up Suggestions */}
            {aiResponse.followUpSuggestions && aiResponse.followUpSuggestions.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Follow-up Suggestions:</Text>
                {aiResponse.followUpSuggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {isProcessing ? 'Processing your request...' : 'Enter a message and press Send to test the AI assistant.'}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  responseContainer: {
    gap: 12,
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  streamingIndicator: {
    fontSize: 16,
    color: '#007AFF',
    opacity: 0.7,
  },
  streamingText: {
    fontSize: 12,
    color: '#007AFF',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  weatherCard: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
  },
  weatherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  weatherRecommendation: {
    fontSize: 14,
    color: '#666',
  },
  trafficCard: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 6,
  },
  trafficText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  trafficRecommendation: {
    fontSize: 14,
    color: '#666',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 40,
  },
});