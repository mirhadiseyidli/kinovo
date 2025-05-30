import React, { useState } from 'react';
import { Alert, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView, View, Image, Dimensions } from 'react-native';
import axios from 'axios';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import auth from '@react-native-firebase/auth';
import AnimatedCheckBox from '@/components/AnimatedCheckBox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SignUpContent: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // UI states
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    dob: false,
    email: false,
    password: false,
    confirmPassword: false,
    phone: false
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateDOB = (dob: string) => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(dob)) return false;
    
    const date = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    return age >= 13 && age <= 120;
  };

  const validatePhone = (phone: string) => {
    // Remove any formatting characters
    const cleanedPhone = phone.replace(/\D/g, '');
    // Check if it has exactly 10 digits
    return cleanedPhone.length === 10;
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Limit to 10 digits
    const truncated = cleaned.slice(0, 10);
    
    if (truncated.length === 0) return '';
    if (truncated.length <= 3) return `(${truncated}`;
    if (truncated.length <= 6) return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
  };

  const getFullPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    console.log('Phone number cleaning:', {
      original: phone,
      cleaned: cleaned
    });
    // Ensure we have exactly 10 digits and prefix with +1
    const formatted = cleaned.length === 10 ? `+1${cleaned}` : '';
    console.log('Final formatted number:', formatted);
    return formatted;
  };

  const handleFieldChange = (field: string, value: string) => {
    const setters: { [key: string]: (value: string) => void } = {
      firstName: setFirstName,
      lastName: setLastName,
      dob: setDob,
      email: setEmail,
      password: setPassword,
      confirmPassword: setConfirmPassword,
      phone: setPhoneNumber
    };

    if (field === 'phone') {
      // Format the phone number for display
      const formattedPhone = formatPhoneNumber(value);
      setters[field](formattedPhone);
    } else {
      setters[field](value);
    }
    
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Field-specific validation
    let error = '';
    switch (field) {
      case 'firstName':
      case 'lastName':
        error = !value.trim() ? `${field === 'firstName' ? 'First' : 'Last'} name is required` : '';
        break;
      case 'email':
        error = !validateEmail(value) ? 'Invalid email address' : '';
        break;
      case 'password':
        error = value.length < 6 ? 'Password must be at least 6 characters' : '';
        break;
      case 'confirmPassword':
        error = value !== password ? 'Passwords do not match' : '';
        break;
      case 'dob':
        error = !validateDOB(value) ? 'Invalid date (YYYY-MM-DD) or age must be 13+' : '';
        break;
      case 'phone':
        if (value) {
          const cleaned = value.replace(/\D/g, '');
          error = cleaned.length < 10 ? 'Please enter a complete phone number' : 
                 cleaned.length > 10 ? 'Phone number should be 10 digits' : '';
        }
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateStep1 = () => {
    const newErrors = {
      email: !validateEmail(email) ? 'Invalid email address' : '',
      password: password.length < 6 ? 'Password must be at least 6 characters' : '',
      confirmPassword: password !== confirmPassword ? 'Passwords do not match' : '',
    };

    setErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({
      ...prev,
      email: true,
      password: true,
      confirmPassword: true,
    }));

    return !Object.values(newErrors).some(error => error !== '');
  };

  const validateStep2 = () => {
    const newErrors = {
      phone: !validatePhone(phoneNumber) ? 'Please enter a valid 10-digit phone number' : '',
    };

    setErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({
      ...prev,
      phone: true,
    }));

    return !Object.values(newErrors).some(error => error !== '');
  };

  const validateStep3 = () => {
    const newErrors = {
      firstName: !firstName.trim() ? 'First name is required' : '',
      lastName: !lastName.trim() ? 'Last name is required' : '',
      dob: !validateDOB(dob) ? 'Invalid date (YYYY-MM-DD) or age must be 13+' : '',
    };

    setErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({
      ...prev,
      firstName: true,
      lastName: true,
      dob: true,
    }));

    if (!isAgreedToTerms) {
      Alert.alert('Agreement Required', 'Please agree to the Terms of Service and Privacy Policy');
      return false;
    }

    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      handleSendVerificationCode();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSignUp = async () => {
    if (!validateStep3()) {
      const errorMessages = Object.values(errors).filter(error => error !== '');
      Alert.alert('Validation Error', errorMessages.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/signup`, {
        firstName,
        lastName,
        email,
        password,
        dob,
        phoneNumber
      });

      if (response.data.success) {
        router.replace('/');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Registration Failed', error.response?.data?.message || 'An error occurred during registration');
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      console.log('Current phone number state:', phoneNumber);
      
      if (!validatePhone(phoneNumber)) {
        console.log('Phone validation failed');
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit US phone number');
        return;
      }

      setLoading(true);
      const fullPhoneNumber = getFullPhoneNumber(phoneNumber);
      
      console.log('Phone number validation:', {
        input: phoneNumber,
        cleaned: phoneNumber.replace(/\D/g, ''),
        formatted: fullPhoneNumber,
        length: fullPhoneNumber.length,
        startsWithPlus1: fullPhoneNumber.startsWith('+1')
      });

      // Additional validation to ensure we have a valid E.164 format
      if (!fullPhoneNumber || fullPhoneNumber.length !== 12 || !fullPhoneNumber.startsWith('+1')) {
        console.log('E.164 format validation failed');
        throw new Error('Invalid phone number format');
      }

      console.log('Attempting to send verification code to:', fullPhoneNumber);

      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);
      console.log('Verification confirmation received');
      
      setVerificationId(confirmation.verificationId);
      setShow2FA(true);
    } catch (error: any) {
      console.error('Phone verification error details:', {
        errorCode: error.code,
        errorMessage: error.message,
        fullError: error
      });
      
      let errorMessage = 'Failed to send verification code';
      
      if (error.code === 'auth/invalid-phone-number' || error.message === 'Invalid phone number format') {
        errorMessage = 'Please enter a valid 10-digit US phone number';
      } else if (error.code === 'auth/argument-error') {
        errorMessage = 'Please enter a complete 10-digit phone number';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (accessToken: string, refreshToken: string, userId: string) => {
    // Handle successful verification and login
    router.replace('/');
  };

  const handleCancel2FA = () => {
    setShow2FA(false);
    router.replace('/login');
  };

  const renderStepIndicator = () => (
    <ThemedView style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
      {[1, 2, 3].map((step) => (
        <ThemedView
          key={step}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: currentStep >= step ? themeColors.mountainGreen : themeColors.textSecondary,
            marginHorizontal: 4,
          }}
        />
      ))}
    </ThemedView>
  );

  const renderStep1 = () => (
    <>
      <Input
        value={email}
        onChangeText={(value) => handleFieldChange('email', value)}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 12,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.email && errors.email) ? 1 : 0,
          borderColor: (touched.email && errors.email) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="mail" size={18} color={themeColors.placeholderTextColor} />}
      />

      <Input
        value={password}
        onChangeText={(value) => handleFieldChange('password', value)}
        placeholder="Password"
        secureTextEntry
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 12,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.password && errors.password) ? 1 : 0,
          borderColor: (touched.password && errors.password) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
      />

      <Input
        value={confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        placeholder="Confirm Password"
        secureTextEntry
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 48,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.confirmPassword && errors.confirmPassword) ? 1 : 0,
          borderColor: (touched.confirmPassword && errors.confirmPassword) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <Input
        value={phoneNumber}
        onChangeText={(value) => handleFieldChange('phone', value)}
        placeholder="Phone Number (e.g., (123) 456-7890)"
        keyboardType="phone-pad"
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 48,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.phone && errors.phone) ? 1 : 0,
          borderColor: (touched.phone && errors.phone) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="phone" size={18} color={themeColors.placeholderTextColor} />}
      />
      <ThemedText style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: -40, marginBottom: 40, textAlign: 'center' }}>
        Enter your 10-digit US phone number
      </ThemedText>
    </>
  );

  const renderStep3 = () => (
    <>
      <Input
        value={firstName}
        onChangeText={(value) => handleFieldChange('firstName', value)}
        placeholder="First Name"
        autoCapitalize="words"
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 12,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.firstName && errors.firstName) ? 1 : 0,
          borderColor: (touched.firstName && errors.firstName) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="user" size={18} color={themeColors.placeholderTextColor} />}
      />

      <Input
        value={lastName}
        onChangeText={(value) => handleFieldChange('lastName', value)}
        placeholder="Last Name"
        autoCapitalize="words"
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 12,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.lastName && errors.lastName) ? 1 : 0,
          borderColor: (touched.lastName && errors.lastName) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="user" size={18} color={themeColors.placeholderTextColor} />}
      />

      <Input
        value={dob}
        onChangeText={(value) => handleFieldChange('dob', value)}
        placeholder="Date of Birth (YYYY-MM-DD)"
        keyboardType="numeric"
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 48,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.dob && errors.dob) ? 1 : 0,
          borderColor: (touched.dob && errors.dob) ? 'red' : '#D1D5DB',
        }}
        leftIcon={<Feather name="calendar" size={18} color={themeColors.placeholderTextColor} />}
      />

      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 48 }}>
        <AnimatedCheckBox
          value={isAgreedToTerms}
          onValueChange={setIsAgreedToTerms}
          onCheckColor={themeColors.mountainGreen}
          tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }}
          style={{ height: 18, width: 18 }}
        />
        <ThemedView style={{ marginLeft: 8, flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>
            I agree to the{' '}
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <ThemedText style={{ 
              color: themeColors.mountainGreen, 
              textDecorationLine: 'underline',
              fontWeight: '600',
              fontSize: 14,
              lineHeight: 20
            }}>
              Terms of Service
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>{' '}and{' '}</ThemedText>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <ThemedText style={{ 
              color: themeColors.mountainGreen, 
              textDecorationLine: 'underline',
              fontWeight: '600',
              fontSize: 14,
              lineHeight: 20
            }}>
              Privacy Policy
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </>
  );

  if (show2FA) {
    return (
      <TwoFactorAuth
        verificationId={verificationId}
        phoneNumber={phoneNumber}
        onVerificationSuccess={handleVerificationSuccess}
        onCancel={handleCancel2FA}
      />
    );
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Account Details';
      case 2:
        return 'Phone Verification';
      case 3:
        return 'Personal Information';
      default:
        return 'Create Account';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return 'Enter your email and create a password';
      case 2:
        return 'Enter your phone number for verification';
      case 3:
        return 'Tell us about yourself';
      default:
        return '';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          flexGrow: 1,
          justifyContent: 'space-between'
        }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="none"
        scrollEnabled={false}
      >
        <ThemedView style={{ 
          flex: 1, 
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'ios' ? 20 : 0
        }}>
          {/* Top Section: Logo + Steps */}
          <ThemedView>
            {/* Logo and Company Name Section */}
            <ThemedView style={{ 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 32,
              marginTop: Platform.OS === 'ios' ? 0 : 20
            }}>
              <Image
                source={require('@/assets/logo_2.png')}
                style={{
                  width: width * 0.45,
                  height: width * 0.45,
                  resizeMode: 'contain',
                  bottom: 0,
                }}
              />
              <ThemedText style={{ fontSize: 40, fontFamily: 'Helvetica Neue Bold', fontWeight: 'bold', letterSpacing: -1, alignSelf: 'center' }}>Kinovo</ThemedText>
            </ThemedView>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Welcome Text Section */}
            <ThemedView style={{ marginBottom: 16, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
                {getStepTitle()}
              </ThemedText>
              <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary, textAlign: 'center' }}>
                {getStepDescription()}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Bottom Section: Form + Buttons */}
          <ThemedView>
            {/* Form Fields */}
            <ThemedView>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={currentStep === 3 ? handleSignUp : handleNext}
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
                  {loading ? 'Creating Account...' : currentStep === 3 ? 'Create Account' : 'Next'}
                </ThemedText>
              </TouchableOpacity>

              {currentStep !== 1 && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={{
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: themeColors.textSecondary,
                    marginTop: 16,
                  }}
                >
                  <ThemedText style={{ color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' }}>
                    Back
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Login Link - Fixed to bottom */}
        {currentStep === 1 && (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center',
            paddingVertical: 16,
            position: 'relative',
            bottom: 0,
            left: 0,
            right: 0,
            marginBottom: 4
          }}>
            <ThemedText>Already have an account?</ThemedText>
            <TouchableOpacity onPress={handleBack}>
              <ThemedText style={{ 
                color: themeColors.mountainGreen, 
                fontWeight: 'bold',
                textDecorationLine: 'underline',
                marginLeft: 4
              }}>
                Login
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUpContent; 