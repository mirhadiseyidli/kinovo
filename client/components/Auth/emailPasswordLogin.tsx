import React, { useState, useEffect } from 'react';
import { Text, Alert, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, PhoneAuthProvider } from 'firebase/auth';
import { auth } from '@/config/firebase';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { AuthLoginProps, ApiError, EmailLoginProps } from '@/types/allTypes';
import AnimatedCheckBox from '../AnimatedCheckBox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TwoFactorAuth from './TwoFactorAuth';

const { width } = Dimensions.get('window');

// Function to calculate font size relative to screen width
const getFontSize = (percentage: number) => (width * percentage) / 100;

const REMEMBERED_EMAIL_KEY = '@kinovo_remembered_email';

const EmailLogin: React.FC<EmailLoginProps> = ({ onLoginSuccess }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', phone: '' });
  const [isChecked, setIsChecked] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setIsChecked(true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleAuthError = (error: any) => {
    console.error('Auth error:', error);
    let errorMessage = 'An error occurred during authentication';
    
    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'An account already exists with this email';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      default:
        errorMessage = error.message || 'Authentication failed';
    }
    
    Alert.alert('Authentication Error', errorMessage);
    return errorMessage;
  };

  const handleAuth = async () => {
    setTouched({ email: true, password: true });
    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Invalid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      // Save email if remember me is checked
      if (isChecked) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // After successful email/password auth, show phone number input for 2FA
      setShowPhoneInput(true);
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      setErrors((prev) => ({ ...prev, password: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhoneNumber,
        // @ts-ignore - RecaptchaVerifier is not needed in Expo
        null
      );
      
      setVerificationId(verificationId);
      setShow2FA(true);
      setShowPhoneInput(false);
    } catch (error: any) {
      console.error('Phone verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setShow2FA(false);
    setShowPhoneInput(true);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({ email: '', password: '', phone: '' });
  };

  if (show2FA) {
    return (
      <TwoFactorAuth
        verificationId={verificationId}
        phoneNumber={phoneNumber}
        onVerificationSuccess={onLoginSuccess}
        onCancel={handleCancel2FA}
      />
    );
  }

  return (
    <ThemedView style={{ width: '100%', paddingHorizontal: 16 }}>
      <ThemedView style={{ flex: Platform.OS === 'ios' ? 0.8 : 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back!'}
        </ThemedText>
        <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
          {showPhoneInput ? 'Enter your phone number for 2FA' : (isSignUp ? 'Sign up for an account' : 'Log into your account')}
        </ThemedText>
      </ThemedView>

      {showPhoneInput ? (
        <ThemedView>
          <Input
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder="Enter your phone number (e.g., +1234567890)"
            keyboardType="phone-pad"
            style={{
              backgroundColor: themeColors.inputBackgroundColor,
              borderRadius: 8,
              paddingHorizontal: 16,
              height: 44,
              marginBottom: 20,
              fontSize: 16,
              color: themeColors.text,
            }}
            leftIcon={<Feather name="phone" size={18} color={themeColors.placeholderTextColor} />}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSendVerificationCode}
            disabled={loading}
            style={{
              alignItems: 'center',
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 12,
              borderRadius: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
          <ThemedView>
            <Input
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: themeColors.inputBackgroundColor,
                borderRadius: 8,
                paddingHorizontal: 16,
                height: 44,
                marginBottom: 4,
                fontSize: 16,
                color: themeColors.text,
                borderWidth: (touched.email && errors.email) ? 1 : 0,
                borderColor: (touched.email && errors.email) ? 'red' : '#D1D5DB',
              }}
              leftIcon={<Feather name="mail" size={18} color={themeColors.placeholderTextColor} />}
              onFocus={() => setErrors((prev) => ({ ...prev, email: '' }))}
            />
            <Input
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Enter your password"
              secureTextEntry
              style={{
                backgroundColor: themeColors.inputBackgroundColor,
                borderRadius: 8,
                paddingHorizontal: 16,
                height: 44,
                fontSize: 14,
                color: themeColors.text,
                borderWidth: (touched.password && errors.password) ? 1 : 0,
                borderColor: (touched.password && errors.password) ? 'red' : '#D1D5DB',
              }}
              leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
              onFocus={() => setErrors((prev) => ({ ...prev, password: '' }))}
            />
          </ThemedView>

          {!isSignUp && (
            <ThemedView
              style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AnimatedCheckBox
                  value={isChecked}
                  onValueChange={(value) => setIsChecked(value)}
                  onCheckColor={themeColors.mountainGreen}
                  tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }}
                  style={{ height: 18, width: 18 }}
                  label="Remember Me"
                  topContainerStyle={{ gap: 4 }}
                />
              </ThemedView>
              <ThemedText>Forgot Password?</ThemedText>
            </ThemedView>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAuth}
            disabled={loading}
            style={{
              alignItems: 'center',
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 12,
              borderRadius: 8,
              opacity: loading ? 0.7 : 1,
              marginBottom: 8,
            }}
          >
            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </ThemedView>
  );
};

export default EmailLogin;