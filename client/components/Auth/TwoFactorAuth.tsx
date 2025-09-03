import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import api from '@/utils/api';

type VerificationConfirmation = {
  verificationId: string;
  confirm?: (code: string) => Promise<{ user: unknown }>;
};

interface TwoFactorAuthProps {
  phoneNumber?: string;
  email?: string;
  mode?: 'phone' | 'email';
  onVerificationSuccess: (verificationId: string, verificationCode: string) => void;
  onVerificationStart?: () => void;
  onVerificationError?: () => void;
  onCancel: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  phoneNumber,
  email,
  mode = phoneNumber ? 'phone' : 'email',
  onVerificationSuccess,
  onVerificationStart,
  onVerificationError,
  onCancel
}) => {
  const [confirmation, setConfirmation] = useState<VerificationConfirmation | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [fullCode, setFullCode] = useState('');
  const inputRefs = useRef<TextInput[]>([]);
  const hiddenInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    sendVerificationCode();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  const sendVerificationCode = async () => {
    try {
      setLoading(true);
      
      if (mode === 'email' && email) {
        // Send email verification code
        const response = await api.post('/api/auth/2fa/send', {
          email: email
        });
        
        if (response.data.success) {
          setConfirmation({ verificationId: 'email-verification' });
          setResendTimer(60);
          Alert.alert('Success', 'Verification code sent to your email');
        }
      } else {
        // Phone verification no longer supported - Firebase removed
        Alert.alert('Error', 'Only email verification is available.');
        return;
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert(
        'Verification Error',
        error.response?.data?.message || error.message || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle input from the hidden input (for iOS autofill)
  const handleHiddenInputChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const numericText = text.replace(/\D/g, '').slice(0, 6);
    setFullCode(numericText);
    
    // Split into individual digits for display
    const digits = numericText.split('');
    const newCode = Array(6).fill('').map((_, index) => digits[index] || '');
    setVerificationCode(newCode);
    
    // Auto-verify if we have 6 digits
    if (numericText.length === 6) {
      setTimeout(() => {
        verifyCodeWithInput(numericText);
      }, 100);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);
    
    // Update the hidden input as well
    const newFullCode = newCode.join('');
    setFullCode(newFullCode);

    // Auto-advance to next field
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace') {
      if (index > 0 && !verificationCode[index]) {
        const newCode = [...verificationCode];
        newCode[index - 1] = '';
        setVerificationCode(newCode);
        setFullCode(newCode.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleInputFocus = (index: number) => {
    // When any visible input is focused, also focus the hidden input
    hiddenInputRef.current?.focus();
  };

  const verifyCodeWithInput = async (code: string) => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    if (!confirmation) {
      Alert.alert('Error', 'Verification session expired. Please request a new code.');
      return;
    }

    try {
      setLoading(true);
      onVerificationStart?.();
      
      if (mode === 'email' && email) {
        // Verify email code
        const response = await api.post('/api/auth/2fa/verify', {
          email: email,
          code: code
        });
        
        if (response.data.success) {
          onVerificationSuccess('email-verified', code);
        } else {
          throw new Error(response.data.message || 'Failed to verify code');
        }
      } else {
        // Phone verification no longer supported
        throw new Error('Only email verification is available.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      onVerificationError?.();
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || error.message || 'Failed to verify code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    await verifyCodeWithInput(code);
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await sendVerificationCode();
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
          Verify Your {mode === 'email' ? 'Email' : 'Phone'}
        </ThemedText>
        
        <ThemedText style={{ textAlign: 'center', marginBottom: 20, color: themeColors.textSecondary }}>
          Enter the 6-digit code sent to {mode === 'email' ? email : phoneNumber}
        </ThemedText>

        {/* Hidden input for iOS autofill */}
        <TextInput
          ref={hiddenInputRef}
          style={{
            position: 'absolute',
            left: -9999,
            opacity: 0,
            height: 0,
            width: 0
          }}
          value={fullCode}
          onChangeText={handleHiddenInputChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus={true}
        />

        <ThemedView style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginBottom: 40,
          width: '100%'
        }}>
          {verificationCode.map((digit, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleInputFocus(index)}
              style={{
                width: 45,
                height: 52,
                backgroundColor: themeColors.inputBackgroundColor,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: digit ? themeColors.mountainGreen : 'transparent',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <TextInput
                ref={ref => {
                  if (ref) {
                    inputRefs.current[index] = ref;
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize: 24,
                  textAlign: 'center',
                  color: themeColors.text,
                  backgroundColor: 'transparent'
                }}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleInputFocus(index)}
                selectTextOnFocus={true}
                editable={!loading}
              />
            </TouchableOpacity>
          ))}
        </ThemedView>

        <TouchableOpacity
          onPress={handleVerifyCode}
          disabled={loading || verificationCode.join('').length !== 6}
          style={{
            backgroundColor: themeColors.mountainGreen,
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 10,
            opacity: (loading || verificationCode.join('').length !== 6) ? 0.5 : 1,
            width: '100%'
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Verify Code
            </ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendCode}
          disabled={loading || resendTimer > 0}
          style={{
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            opacity: (loading || resendTimer > 0) ? 0.5 : 1,
            width: '100%'
          }}
        >
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          style={{
            alignItems: 'center',
            backgroundColor: 'transparent',
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.textSecondary,
            marginTop: 16,
            width: '100%'
          }}
        >
          <ThemedText style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' }}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};

export default TwoFactorAuth; 