import React, { createContext, useState, useContext, ReactNode } from 'react';
import { View, Text, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';

const EventCreatedMessageContext = createContext({ show: () => {} });

export const useEventCreatedMessage = () => useContext(EventCreatedMessageContext);

export const EventCreatedMessageProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const show = () => {
    setVisible(true);
    setTimeout(() => setVisible(false), 1500);
  };

  return (
    <EventCreatedMessageContext.Provider value={{ show }}>
      {children}
      {visible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: screenHeight,
          width: screenWidth,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <ThemedView style={{
            backgroundColor: themeColors.popUpMessageBackgroundColor,
            padding: 16,
            borderRadius: 8,
          }}>
            <Text style={{ color: themeColors.text, fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>Event Created!</Text>
          </ThemedView>
        </View>
      )}
    </EventCreatedMessageContext.Provider>
  );
};