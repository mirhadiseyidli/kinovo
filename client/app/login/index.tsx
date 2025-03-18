// app/(auth)/auth.tsx

import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import EmailLogin from '@/components/Auth/emailPasswordLogin';
import GoogleOAuth from '@/components/Auth/googleOAuth';
import AppleOAuth from '@/components/Auth/appleOAuth';
import FacebookOAuth from '@/components/Auth/facebookOAuth';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur'; 
import { useAuthSession } from "@/components/Auth/AuthProvider";
import axios from 'axios';

const loginBg = require('../../assets/login-bg.jpg');

export default function Auth() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuthSession();

  const handleLogin = async (accessToken: string, refreshToken: string) => {
    try {
      // Trigger authentication state update
      signIn(accessToken, refreshToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  };

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: '2%', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Logo Background Section */}
      <ThemedView style={{ flex: 5 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end'}}>
          <Image
            source={require('../../assets/logo_2.png')}
            style={{
              height: '70%',
              aspectRatio: 1,
              resizeMode: 'contain',
              bottom: 0,
            }}
          />
        </View>
        <ThemedText style={{ fontSize: 40, fontFamily: 'Didot', fontWeight: 'bold', alignSelf: 'center' }}>Kinovo</ThemedText>
      </ThemedView>

      {/* Login Section */}
      <ThemedView style={{ flex: 5, alignItems: 'center', justifyContent: 'center', marginBottom: '5%' }}>
        <EmailLogin onLoginSuccess={handleLogin} />
      </ThemedView>

      {/* Separator */}
      <ThemedView style={{ flex: 0.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <ThemedView
          style={{
            flex: 1,
            height: 1,
            backgroundColor: Colors[colorScheme ?? 'dark'].textSecondary,
          }}
        />
        <ThemedText
          style={{
            flexShrink: 1,
            marginHorizontal: 16,
            color: Colors[colorScheme ?? 'dark'].textSecondary,
            textAlign: 'center',
          }}
        >
          or continue with
        </ThemedText>
        <ThemedView style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
      </ThemedView>

      {/* OAuth Buttons */}
      <ThemedView style={{ flex: 1, flexDirection: 'row', width: '100%', paddingHorizontal: '10%', alignItems: 'center', justifyContent: 'space-evenly' }}>
        <AppleOAuth onLoginSuccess={handleLogin} />
        <FacebookOAuth onLoginSuccess={handleLogin} />
        <GoogleOAuth onLoginSuccess={handleLogin} />
      </ThemedView>

      {/* Sign Up Link */}
      <ThemedView style={{ flex: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ flexShrink: 1 }}>Don't have an account?</ThemedText>
        <TouchableOpacity onPress={() => router.push('/login/signUp')}>
          <ThemedText style={{ flexShrink: 1, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline', marginLeft: 4 }}>
            Sign Up
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}
