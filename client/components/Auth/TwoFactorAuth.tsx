import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { initiatePhoneAuth } from '@/config/firebase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TwoFactorAuthProps {
  phoneNumber: string;
  onVerificationSuccess: (verificationId: string, verificationCode: string) => void;
  onCancel: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  phoneNumber,
  onVerificationSuccess,
  onCancel
}) => {
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<TextInput[]>([]);
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
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.length === 10 ? `+1${cleanedPhone}` : phoneNumber;
      
      const result = await initiatePhoneAuth(formattedPhone);
      
      setConfirmation(result);
      setResendTimer(60);
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert(
        'Verification Error',
        error.message || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

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
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
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
      const userCredential = await confirmation.confirm(code);
      
      if (userCredential?.user && confirmation.verificationId) {
        const result = await onVerificationSuccess(confirmation.verificationId, code);
      } else {
        throw new Error('Failed to verify code. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
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

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await sendVerificationCode();
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
          Verify Your Phone
        </ThemedText>
        
        <ThemedText style={{ textAlign: 'center', marginBottom: 20, color: themeColors.textSecondary }}>
          Enter the 6-digit code sent to {phoneNumber}
        </ThemedText>

        <ThemedView style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginBottom: 40,
          width: '100%'
        }}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                if (ref) {
                  inputRefs.current[index] = ref;
                }
              }}
              style={{
                width: 45,
                height: 52,
                backgroundColor: themeColors.inputBackgroundColor,
                borderRadius: 8,
                fontSize: 24,
                textAlign: 'center',
                color: themeColors.text,
                borderWidth: 1,
                borderColor: digit ? themeColors.mountainGreen : 'transparent'
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus={true}
            />
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