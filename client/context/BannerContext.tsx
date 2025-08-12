import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';
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
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const hideBanner = useCallback(() => {
    setIsVisible(false);
    // Hide message after animation completes
    setTimeout(() => {
      setMessage(null);
    }, 300);
  }, []);

  const showBanner = useCallback((msg: string) => {
    setMessage(msg);
    setIsVisible(true);

    // Auto hide after 2 seconds
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        hideBanner();
      }
    }, 2000);
  }, [hideBanner]);

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}
      {message && (
        <Animated.View
          style={{
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
            backgroundColor: themeColors.mountainGreen,
            transform: [{ translateY: isVisible ? 0 : -100 }],
            transitionProperty: ['transform'],
            transitionDuration: '300ms',
            transitionTimingFunction: 'ease-in-out',
          }}
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