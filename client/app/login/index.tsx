import React from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import EmailLogin from '@/components/Auth/emailPasswordLogin';
import GoogleOAuth from '@/components/Auth/googleOAuth';
import AppleOAuth from '@/components/Auth/appleOAuth';
import FacebookOAuth from '@/components/Auth/facebookOAuth';
import { useRouter } from 'expo-router';
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

  const handleLogin: TokenTypes = async (accessToken, refreshToken, userId, firebaseToken) => {
    try {
      // Trigger authentication state update
      signIn(accessToken, refreshToken, userId, firebaseToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: themeColors.background }}
    >
      <ScrollView 
        bounces={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      >
        <View style={{ flex: 1 }}>
          {/* Logo and Company Name Section */}
          <ThemedView style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'flex-start', 
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
            <ThemedText style={{ fontSize: 40, fontFamily: 'Helvetica Neue Bold', fontWeight: 'bold', letterSpacing: -1, alignSelf: 'center' }}>Kinovo</ThemedText>
          </ThemedView>

          {/* Login Section - Aligned to bottom */}
          <ThemedView style={{ 
            flex: 1, 
            justifyContent: 'flex-end',
            paddingBottom: Platform.OS === 'ios' ? 40 : 20
          }}>
            <ThemedView style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <EmailLogin onLoginSuccess={handleLogin} />
            </ThemedView>

            {/* Separator */}
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <ThemedView
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: themeColors.border,
                }}
              />
              <ThemedText
                style={{
                  marginHorizontal: 16,
                  color: themeColors.border,
                  textAlign: 'center',
                }}
              >
                or continue with
              </ThemedText>
              <ThemedView style={{ flex: 1, height: 1, backgroundColor: themeColors.border }} />
            </ThemedView>

            {/* OAuth Buttons */}
            <ThemedView style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 16 }}>
              <AppleOAuth onLoginSuccess={handleLogin} />
              {/* <FacebookOAuth onLoginSuccess={handleLogin} /> */}
              <GoogleOAuth onLoginSuccess={handleLogin} />
            </ThemedView>
          </ThemedView>
        </View>

        {/* Sign Up Link */}
        <ThemedView style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          <ThemedText>Don't have an account?</ThemedText>
          <TouchableOpacity onPress={() => router.push('/login/signUp')}>
            <ThemedText style={{ color: themeColors.mountainGreen, fontWeight: '600', textDecorationLine: 'underline', marginLeft: 4 }}>
              Sign Up
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
