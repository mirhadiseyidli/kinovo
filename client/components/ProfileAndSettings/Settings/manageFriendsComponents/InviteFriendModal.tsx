import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TouchableWithoutFeedback, Animated, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Input from '@/components/Input';
import { Feather } from '@expo/vector-icons';
import api from '@/utils/api';
import { useBanner } from '@/context/BannerContext';

interface InviteFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

const InviteFriendModal: React.FC<InviteFriendModalProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inviteType, setInviteType] = useState<'email' | 'phone'>('email');
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [isValidPhone, setIsValidPhone] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showBanner } = useBanner();

  const [modalVisible, setModalVisible] = useState(visible);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animationRef: Animated.CompositeAnimation | null = null;
    
    if (visible) {
      setModalVisible(true);
      animationRef = Animated.timing(opacityAnim, { 
        toValue: 1, 
        duration: 200, 
        useNativeDriver: true 
      });
      animationRef.start();
    } else {
      animationRef = Animated.timing(opacityAnim, { 
        toValue: 0, 
        duration: 200, 
        useNativeDriver: true 
      });
      animationRef.start(() => {
        setModalVisible(false);
        // Reset state after modal is fully closed
        setEmail('');
        setPhoneNumber('');
        setInviteType('email');
        setIsValidEmail(true);
        setIsValidPhone(true);
        setLoading(false);
      });
    }

    // Cleanup function to stop animations on unmount or dependency change
    return () => {
      if (animationRef) {
        animationRef.stop();
      }
    };
  }, [visible, opacityAnim]);

  const validateEmail = (text: string) => {
    // A simple regex for email validation
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(text);
  };

  const validatePhoneNumber = (text: string) => {
    // Remove all non-digit characters for validation
    const cleaned = text.replace(/\D/g, '');
    // US phone number should have 10 digits (without country code) or 11 digits (with country code)
    return cleaned.length === 10 || cleaned.length === 11;
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as +1-(234)-567-8901
    if (cleaned.length >= 10) {
      const countryCode = cleaned.length === 11 ? cleaned[0] : '1';
      const areaCode = cleaned.slice(-10, -7);
      const firstPart = cleaned.slice(-7, -4);
      const secondPart = cleaned.slice(-4);
      return `+${countryCode}-(${areaCode})-${firstPart}-${secondPart}`;
    }
    return text;
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!isValidEmail) {
      setIsValidEmail(true);
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    if (!isValidPhone) {
      setIsValidPhone(true);
    }
  };

  const handleInvite = async () => {
    if (inviteType === 'email') {
      if (!validateEmail(email)) {
        setIsValidEmail(false);
        return;
      }

      setLoading(true);
      try {
        await api.post('/api/managefriends/invite-by-email', { email });
        showBanner('Invitation Sent!');
        onClose();
      } catch (error: any) {
        console.error('Error sending invitation:', error);
        const errorMessage = error.response?.data?.message || 'Failed to send invitation.';
        showBanner(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone invitation - open SMS
      if (!validatePhoneNumber(phoneNumber)) {
        setIsValidPhone(false);
        return;
      }

      const inviteMessage = "Hey! I'd like to invite you to join Kinovo - a great app for discovering and creating events. Check it out!\nhttps://kinovo.app/invite";
      const phoneOnly = phoneNumber.replace(/\D/g, '');
      const smsUrl = `sms:+${phoneOnly}?body=${encodeURIComponent(inviteMessage)}`;
      
      try {
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (canOpen) {
          await Linking.openURL(smsUrl);
          showBanner('SMS app opened!');
          onClose();
        } else {
          showBanner('Unable to open SMS app');
        }
      } catch (error) {
        console.error('Error opening SMS:', error);
        showBanner('Failed to open SMS app');
      }
    }
  };
  
  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: opacityAnim
        }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'position' : undefined}
            style={{ width: '90%' }}
          >
            <TouchableWithoutFeedback>
              <View style={{ width: '100%' }}>
                <ThemedView style={{
                  padding: 16,
                  borderRadius: 20,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  width: '100%',
                }}>
                  <View style={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingBottom: 16,
                  }}>
                    <ThemedText style={{ fontSize: 20, fontWeight: 'bold' }}>Invite a Friend</ThemedText>
                    <TouchableOpacity 
                      style={{ position: 'absolute', top: 0, right: 0 }} 
                      onPress={onClose}
                    >
                      <Feather name="x" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    width: '100%',
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: themeColors.border
                  }} />
                  <ThemedText style={{
                    fontSize: 14,
                    textAlign: 'center',
                    opacity: 0.7,
                    marginTop: 16,
                    marginBottom: 16,
                  }}>
                    Choose how you'd like to invite your friend to join Kinovo.
                  </ThemedText>

                  {/* Toggle buttons */}
                  <View style={{ 
                    flexDirection: 'row', 
                    width: '100%', 
                    marginBottom: 16,
                    backgroundColor: themeColors.border,
                    borderRadius: 8,
                    padding: 2
                  }}>
                    <TouchableOpacity
                      style={[
                        {
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 6,
                          alignItems: 'center',
                        },
                        inviteType === 'email' && {
                          backgroundColor: themeColors.mountainGreen,
                        }
                      ]}
                      onPress={() => setInviteType('email')}
                    >
                      <Text style={{
                        color: inviteType === 'email' ? 'white' : themeColors.text,
                        fontWeight: inviteType === 'email' ? 'bold' : 'normal',
                        fontSize: 14
                      }}>
                        Email
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        {
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 6,
                          alignItems: 'center',
                        },
                        inviteType === 'phone' && {
                          backgroundColor: themeColors.mountainGreen,
                        }
                      ]}
                      onPress={() => setInviteType('phone')}
                    >
                      <Text style={{
                        color: inviteType === 'phone' ? 'white' : themeColors.text,
                        fontWeight: inviteType === 'phone' ? 'bold' : 'normal',
                        fontSize: 14
                      }}>
                        Phone
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input field based on selected type */}
                  <View style={{ width: '100%' }}>
                    {inviteType === 'email' ? (
                      <Input
                        placeholder="friend@example.com"
                        value={email}
                        onChangeText={handleEmailChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[
                          {
                            width: '100%',
                            padding: 12,
                            borderRadius: 8,
                            backgroundColor: themeColors.inputBackgroundColor, 
                            color: themeColors.text 
                          },
                          !isValidEmail && { borderColor: 'red', borderWidth: 1 }
                        ]}
                      />
                    ) : (
                      <Input
                        placeholder="+1-(234)-567-8901"
                        value={phoneNumber}
                        onChangeText={handlePhoneChange}
                        keyboardType="phone-pad"
                        style={[
                          {
                            width: '100%',
                            padding: 12,
                            borderRadius: 8,
                            backgroundColor: themeColors.inputBackgroundColor, 
                            color: themeColors.text 
                          },
                          !isValidPhone && { borderColor: 'red', borderWidth: 1 }
                        ]}
                      />
                    )}
                  </View>
                  <TouchableOpacity 
                    style={{
                      marginTop: 8,
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 30,
                      elevation: 2,
                      width: '100%',
                      alignItems: 'center',
                      backgroundColor: themeColors.mountainGreen
                    }} 
                    onPress={handleInvite}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={themeColors.text} />
                    ) : (
                      <Text style={{
                        fontWeight: 'bold',
                        fontSize: 16,
                        color: 'white'
                      }}>
                        {inviteType === 'email' ? 'Send Email' : 'Send SMS'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default InviteFriendModal; 