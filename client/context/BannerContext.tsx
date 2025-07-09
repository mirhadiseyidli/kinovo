import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BannerContextType {
  showBanner: (message: string) => void;
}

const BannerContext = createContext<BannerContextType | null>(null);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const [message, setMessage] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;

  const hideBanner = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMessage(null);
    });
  }, [translateY]);

  const showBanner = useCallback((msg: string) => {
    setMessage(msg);

    // Slide down
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto hide after 2 seconds
    setTimeout(() => {
      hideBanner();
    }, 2000);
  }, [translateY, hideBanner]);

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}
      {message && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              zIndex: 9999,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 2,
              elevation: 4,
            },
            {
              transform: [{ translateY }],
              backgroundColor: themeColors.mountainGreen,
            },
          ]}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: themeColors.text }}> {message} </Text>
        </Animated.View>
      )}
    </BannerContext.Provider>
  );
};

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanner must be used within a BannerProvider');
  }
  return context;
}; 