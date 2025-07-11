import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TouchableWithoutFeedback, Animated, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showBanner } = useBanner();

  const [modalVisible, setModalVisible] = useState(visible);
  const { height } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setModalVisible(false);
        // Reset state after modal is fully closed
        setEmail('');
        setIsValidEmail(true);
        setLoading(false);
      });
    }
  }, [visible]);

  const validateEmail = (text: string) => {
    // A simple regex for email validation
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(text);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!isValidEmail) {
      setIsValidEmail(true);
    }
  };

  const handleInvite = async () => {
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
              <Animated.View style={{ transform: [{ translateY: slideAnim }], width: '100%' }}>
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
                    Enter your friend's email address to invite them to join Kinovo.
                  </ThemedText>
                  <View style={{ width: '100%' }}>
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
                      }}>Invite</Text>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default InviteFriendModal; 