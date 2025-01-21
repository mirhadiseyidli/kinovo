import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Input from '../../components/Input'; // Import the reusable input component
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const EmailSignUp: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState({ firstName: '', lastName: '', email: '', password: '', dob: '' });

  const validateNameFields = () => {
    const firstNameError = firstName.trim() === '' ? 'First name cannot be empty' : '';
    const lastNameError = lastName.trim() === '' ? 'Last name cannot be empty' : '';
  
    setErrors((prev) => ({
      ...prev,
      firstName: firstNameError,
      lastName: lastNameError,
    }));
  
    return !firstNameError && !lastNameError; // Return true if both fields are valid
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (!validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email address' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  
    const hasMinLength = value.length >= 6;
    const hasCapitalLetter = /[A-Z]/.test(value);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  
    if (!hasMinLength) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 6 characters' }));
    } else if (!hasCapitalLetter) {
      setErrors((prev) => ({ ...prev, password: 'Password must contain at least one capital letter' }));
    } else if (!hasSpecialCharacter) {
      setErrors((prev) => ({ ...prev, password: 'Password must contain at least one special character' }));
    } else {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleDobChange = (value: string) => {
    setDob(value);
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
    if (!dobRegex.test(value)) {
      setErrors((prev) => ({ ...prev, dob: 'Date of Birth must be in YYYY-MM-DD format' }));
    } else {
      setErrors((prev) => ({ ...prev, dob: '' }));
    }
  };

  const handleSignUp = async () => {
    if (!validateNameFields()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/signup`, {
        firstName,
        lastName,
        email,
        password,
        dob,
      });
      if (response.data.success) {
        const { user } = response.data;
        Alert.alert('User Account Registered', `Email: ${user.email}\nName: ${user.first_name} ${user.last_name}`);
      }
    } catch (error: any) {
      console.error('Sign Up failed:', error.response?.data?.message || error.message);
    }
  };

  return (
    <ThemedView className="flex px-6">
      <ThemedView className="mt-36 mb-16 items-center justify-center">
        <ThemedText className="text-3xl">LOGO HERE</ThemedText>
      </ThemedView>
      
      <ThemedView className="flex flex-col">
        <Input
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your First Name"
          error={errors.firstName}
          autoCapitalize="words"
        />
        <Input
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your Last Name"
          error={errors.lastName}
          autoCapitalize="words"
        />
        <Input
          value={dob}
          onChangeText={handleDobChange}
          placeholder="Enter your Date of Birth (YYYY-MM-DD)"
          error={errors.dob}
          keyboardType="numeric"
        />
        <Input
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter your email"
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="Enter your password"
          error={errors.password}
          secureTextEntry
        />
      </ThemedView>
      
      <TouchableOpacity
        className="mt-16 bg-black py-3 rounded-lg active:bg-gray-800"
        onPress={handleSignUp}
      >
        <ThemedText className="text-white text-center text-lg font-medium">Sign Up</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

export default EmailSignUp;