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
  const [confirm, setConfirm] = useState<any>(null);
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
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) return false;
    
    // Check month and day validity
    const [year, month, day] = dob.split('-').map(Number);
    const monthDays = new Date(year, month, 0).getDate();
    if (month < 1 || month > 12 || day < 1 || day > monthDays) return false;
    
    // Calculate age
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      return age - 1 >= 13;
    }
    return age >= 13;
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
    // Ensure we have exactly 10 digits and prefix with +1
    return cleaned.length === 10 ? `+1${cleaned}` : '';
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

    // Initialize error variable
    let error = '';

    if (field === 'phone') {
      // Format the phone number for display
      const formattedPhone = formatPhoneNumber(value);
      setters[field](formattedPhone);
    } else if (field === 'dob') {
      // Remove any non-digits
      const cleaned = value.replace(/\D/g, '');
      
      // Format for display (MM/DD/YYYY)
      let formatted = '';
      if (cleaned.length > 0) {
        // Handle month
        formatted = cleaned.slice(0, 2);
        if (cleaned.length > 2) {
          formatted += '/' + cleaned.slice(2, 4);
          if (cleaned.length > 4) {
            formatted += '/' + cleaned.slice(4, 8);
          }
        }
      }
      
      // Only update if it's a valid partial date or empty
      if (cleaned.length <= 8) {
        setters[field](formatted);
      }
      
      // Validate the date if we have all 8 digits
      if (cleaned.length === 8) {
        const month = cleaned.slice(0, 2);
        const day = cleaned.slice(2, 4);
        const year = cleaned.slice(4, 8);
        
        // Convert to YYYY-MM-DD format for validation
        const isoDate = `${year}-${month}-${day}`;
        error = !validateDOB(isoDate) ? 'Invalid date or age must be 13+' : '';
      }
    } else {
      setters[field](value);
    }
    
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Field-specific validation if error hasn't been set
    if (!error) {
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
        case 'phone':
          if (value) {
            const cleaned = value.replace(/\D/g, '');
            error = cleaned.length < 10 ? 'Please enter a complete phone number' : 
                   cleaned.length > 10 ? 'Phone number should be 10 digits' : '';
          }
          break;
      }
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
    const newErrors: {
      firstName: string;
      lastName: string;
      dob: string;
    } = {
      firstName: !firstName.trim() ? 'First name is required' : '',
      lastName: !lastName.trim() ? 'Last name is required' : '',
      dob: ''
    };

    // Handle DOB validation
    if (dob) {
      const cleaned = dob.replace(/\D/g, '');
      if (cleaned.length === 8) {
        const month = cleaned.slice(0, 2);
        const day = cleaned.slice(2, 4);
        const year = cleaned.slice(4, 8);
        const isoDate = `${year}-${month}-${day}`;
        newErrors.dob = !validateDOB(isoDate) ? 'Invalid date or age must be 13+' : '';
      } else {
        newErrors.dob = 'Please enter a complete date';
      }
    } else {
      newErrors.dob = 'Date of birth is required';
    }

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

  const getDateForSubmission = (displayDate: string): string => {
    if (!displayDate) return '';
    const cleaned = displayDate.replace(/\D/g, '');
    if (cleaned.length !== 8) return '';
    
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    
    return `${year}-${month}-${day}`;
  };

  const handleSignUp = async () => {
    if (!validateStep3()) {
      const errorMessages = Object.values(errors).filter(error => error !== '');
      Alert.alert('Validation Error', errorMessages.join('\n'));
      return;
    }

    setLoading(true);
    try {
      // Format date of birth
      const formattedDob = getDateForSubmission(dob);
      
      // Format phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      if (cleanedPhone.length !== 10) {
        throw new Error('Invalid phone number format');
      }

      // Create the request payload
      const signupData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        password,
        date_of_birth: formattedDob,
        phone_number: {
          country_code: "1",
          area_code: cleanedPhone.substring(0, 3),
          phone_num: cleanedPhone.substring(3),
          full_num: `+1${cleanedPhone}`
        },
        username: email.trim().toLowerCase(),
      };

      console.log('Sending signup data:', signupData);

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/signup`,
        signupData
      );

      if (response.data.success) {
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Signup error:', error.response?.data || error.message);
      setLoading(false);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || error.message || 'An error occurred during registration'
      );
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      if (!validatePhone(phoneNumber)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit US phone number');
        return;
      }

      // Clean the phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      if (cleanedPhone.length !== 10) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit US phone number');
        return;
      }

      // Show 2FA screen
      setShow2FA(true);
    } catch (error: any) {
      console.error('Phone verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Failed to initiate phone verification. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      setLoading(true);
      
      // Send verification details to your backend
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/verify-phone`, {
        verificationId,
        verificationCode,
        phoneNumber,
        email,
        password,
      });

      if (response.data.success) {
        // Move to the next step
        setCurrentStep(3);
        setShow2FA(false);
      } else {
        Alert.alert('Verification Failed', response.data.message || 'Failed to verify phone number');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete verification');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setShow2FA(false);
    setCurrentStep(2);
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
      />

      <Input
        value={dob}
        onChangeText={(value) => handleFieldChange('dob', value)}
        placeholder="Date of Birth (MM/DD/YYYY)"
        keyboardType="numeric"
        maxLength={10}
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 4,
          fontSize: 16,
          color: themeColors.text,
          borderWidth: (touched.dob && errors.dob) ? 1 : 0,
          borderColor: (touched.dob && errors.dob) ? 'red' : '#D1D5DB',
        }}
      />

      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <AnimatedCheckBox
          value={isAgreedToTerms}
          onValueChange={setIsAgreedToTerms}
          onCheckColor={themeColors.mountainGreen}
          tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }}
          style={{ height: 18, width: 18 }}
        />
        <ThemedView style={{ marginLeft: 4, flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
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
      <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingBottom: insets.bottom,
            paddingHorizontal: 16
          }}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <ThemedView style={{ flex: 1 }}>
            {/* Logo and Company Name Section */}
            <ThemedView style={{ 
              alignItems: 'center',
              marginTop: Platform.OS === 'ios' ? 20 : 40,
              marginBottom: 32
            }}>
              <Image
                source={require('@/assets/logo_2.png')}
                style={{
                  width: width * 0.45,
                  height: width * 0.45,
                  resizeMode: 'contain',
                }}
              />
              <ThemedText style={{ 
                fontSize: 40, 
                fontFamily: 'Helvetica Neue Bold', 
                fontWeight: 'bold', 
                letterSpacing: -1
              }}>
                Kinovo
              </ThemedText>
            </ThemedView>

            {/* Two Factor Auth Component */}
            <ThemedView style={{ flex: 1, width: '100%' }}>
              <TwoFactorAuth
                phoneNumber={phoneNumber as string}
                onVerificationSuccess={handleVerificationSuccess}
                onCancel={handleCancel2FA}
              />
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </ThemedView>
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
    <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
          justifyContent: 'space-between'
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        scrollEnabled={true}
      >
        {/* Top Section: Logo + Steps */}
        <ThemedView style={{ paddingTop: Platform.OS === 'ios' ? 20 : 20 }}>
          {/* Logo and Company Name Section */}
          <ThemedView style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 32
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
          <ThemedView style={{ marginBottom: 32, alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
              {getStepTitle()}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary, textAlign: 'center' }}>
              {getStepDescription()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Form Fields Section */}
        <ThemedView>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ThemedView>

        {/* Bottom Section: Buttons */}
        <ThemedView style={{ marginBottom: 16 }}>
          {/* Action Buttons */}
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
        
        {/* Login Link */}
        {currentStep === 1 && (
          <ThemedView style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center',
          }}>
            <ThemedText>Already have an account?</ThemedText>
            <TouchableOpacity onPress={handleBack}>
              <ThemedText style={{ color: themeColors.mountainGreen, fontWeight: '600', textDecorationLine: 'underline', marginLeft: 4 }}>
                Login
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default SignUpContent; 