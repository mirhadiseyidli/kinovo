import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EmailLogin from '../../components/emailPasswordLogin';
import GoogleOAuth from '../../components/googleOAuth';
import AppleOAuth from '../../components/appleOAuth';
import FacebookOAuth from '../../components/facebookOAuth';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const loginBg = require('../../assets/login-bg.jpg');

interface AuthProps {
  onLoginSuccess: (idToken: string) => void; // Explicit type for the login success callback
}

export default function AuthScreen(onLoginSuccess: any) {
  const router = useRouter();

  return (
    <View className="flex-[1] px-[2%]">
      {/* Logo Background Section */}
      <View className="flex-[3.5] w-full h-full items-center justify-end">
        <Text className="flex-[1] flex-shrink absolute bottom-[10%] text-[6vw]">LOGO HERE</Text>
      </View>

      {/* Login Section */}
      <View className="flex-[5] items-center justify-center mb-[5%]">
        <EmailLogin onLoginSuccess={onLoginSuccess} />
      </View>
      
      {/* Separator */}
      <View className='flex-[0.2] flex-row items-center justify-center'>
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="flex-shrink mx-4 text-gray-500 text-center leading-none">or continue with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>
        
        {/* OAuth Buttons */}
      <View className='flex-[1] flex-row w-[100%] h-[100%] px-[10%] items-center justify-evenly'>
        <AppleOAuth onLoginSuccess={onLoginSuccess} />
        <FacebookOAuth onLoginSuccess={onLoginSuccess} />
        {/* <GoogleOAuth onLoginSuccess={onLoginSuccess} /> */}
      </View>

      {/* Sign Up Link */}
      <View className="flex-[0.5] flex-row items-center justify-center">
        <Text className='flex-shrink'>Don't have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text className="flex-shrink text-blue-500 font-semibold underline ml-1">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
