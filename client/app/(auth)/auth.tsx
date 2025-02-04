import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import EmailLogin from '../../components/Auth/emailPasswordLogin';
import GoogleOAuth from '../../components/Auth/googleOAuth';
import AppleOAuth from '../../components/Auth/appleOAuth';
import FacebookOAuth from '../../components/Auth/facebookOAuth';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const loginBg = require('../../assets/login-bg.jpg');

interface AuthProps {
  onLoginSuccess: (idToken: string) => void;
}

export default function AuthScreen(onLoginSuccess: any) {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const fontSize = width * 0.06; // Equivalent to 6vw


  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: '2%' }}>
      {/* Logo Background Section */}
      <ThemedView style={{ flex: 3.5, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
        <ThemedText style={{ position: 'absolute', bottom: '10%', fontSize: fontSize, flex: 1, flexShrink: 1 }}>
          LOGO HERE
        </ThemedText>
      </ThemedView>

      {/* Login Section */}
      <ThemedView style={{ flex: 5, alignItems: 'center', justifyContent: 'center', marginBottom: '5%' }}>
        <EmailLogin onLoginSuccess={onLoginSuccess} />
      </ThemedView>
      
      {/* Separator */}
      <ThemedView style={{ flex: 0.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedView style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
        <ThemedText style={{ flexShrink: 1, marginHorizontal: 16, color: '#6B7280', textAlign: 'center', lineHeight: undefined }}>
          or continue with
        </ThemedText>
        <ThemedView style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
      </ThemedView>
      
      {/* OAuth Buttons */}
      <ThemedView style={{ flex: 1, flexDirection: 'row', width: '100%', height: '100%', paddingHorizontal: '10%', alignItems: 'center', justifyContent: 'space-evenly' }}>
        <AppleOAuth onLoginSuccess={onLoginSuccess} />
        <FacebookOAuth onLoginSuccess={onLoginSuccess} />
        {/* <GoogleOAuth onLoginSuccess={onLoginSuccess} /> */}
      </ThemedView>
      
      {/* Sign Up Link */}
      <ThemedView style={{ flex: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ flexShrink: 1 }}>Don't have an account?</ThemedText>
        <TouchableOpacity onPress={() => router.push('/') }>
          <ThemedText style={{ flexShrink: 1, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline', marginLeft: 4 }}>
            Sign Up
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}
