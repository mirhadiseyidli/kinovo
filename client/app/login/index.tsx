import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import EmailLogin from '@/components/Auth/emailPasswordLogin';
import GoogleOAuth from '@/components/Auth/googleOAuth';
import AppleOAuth from '@/components/Auth/appleOAuth';
import LoginLoadingOverlay from '@/components/Auth/LoginLoadingOverlay';
import AnimatedBackground from '@/components/Auth/AnimatedBackground';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { TokenTypes } from '@/types/allTypes';

const { width } = Dimensions.get('window');

export default function Auth() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { signIn } = useAuthSession();
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginStart = useCallback(() => {
    setIsLoading(true);
    setIsSuccess(false);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsSuccess(true);
  }, []);

  const handleLoginComplete = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
  }, []);

  const handleLoginError = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
  }, []);

  // Reset loading state when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      // Reset loading states when returning to login screen
      setIsLoading(false);
      setIsSuccess(false);
    }, [])
  );

  const handleLogin: TokenTypes = async (accessToken, refreshToken, userId) => {
    try {
      handleLoginSuccess();
      // Small delay to show success animation before navigation
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          signIn(accessToken, refreshToken, userId);
        }
      }, 300);
    } catch (error) {
      console.error('Error storing tokens:', error);
      handleLoginError();
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: themeColors.background, flexShrink: 1 }}
    >
      <AnimatedBackground />
      <View 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          paddingBottom: insets.bottom, 
          flexShrink: 1 
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Logo and Company Name Section */}
          <View style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1
          }}>
            <Image
              source={require('../../assets/logo_2.png')}
              style={{
                width: width * 0.45,
                height: width * 0.45,
                resizeMode: 'contain',
                bottom: 0,
              }}
            />
            <ThemedText style={{ fontSize: 40, fontFamily: 'Helvetica Neue Bold', fontWeight: 'bold', letterSpacing: -1, alignSelf: 'center' }} allowFontScaling={false}>Kinovo</ThemedText>
            <ThemedText style={{ fontSize: 18, marginBottom: 8, textAlign: 'center' }} allowFontScaling={false}>
              Welcome Back!
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: themeColors.textThird, textAlign: 'center', marginBottom: 32 }} allowFontScaling={false}>
              Log into your account
            </ThemedText>
          </View>

          {/* Login Section - Aligned to bottom */}
          <View style={{ 
            paddingBottom: Platform.OS === 'ios' ? 40 : 20
          }}>

            {/* OAuth Buttons */}
            <View style={{ flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center', paddingHorizontal: 16, zIndex: 9999 }}>
              <AppleOAuth 
                onLoginSuccess={handleLogin} 
                onLoginStart={handleLoginStart}
                onLoginError={handleLoginError}
              />
              {/* <FacebookOAuth onLoginSuccess={handleLogin} /> */}
              <GoogleOAuth 
                onLoginSuccess={handleLogin} 
                onLoginStart={handleLoginStart}
                onLoginError={handleLoginError}
              />
            </View>
          </View>
        </View>
      </View>
      
      {/* Loading Overlay */}
      <LoginLoadingOverlay 
        visible={isLoading}
        isSuccess={isSuccess}
        onAnimationComplete={handleLoginComplete}
      />
    </KeyboardAvoidingView>
  );
}
