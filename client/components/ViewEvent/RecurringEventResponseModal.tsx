import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface RecurringEventResponseModalProps {
  visible: boolean;
  onClose: () => void;
  onThisEventOnly: () => void;
  onAllFutureEvents: () => void;
  eventTitle: string;
  newStatus: 'accepted' | 'maybe' | 'rejected';
}

const RecurringEventResponseModal: React.FC<RecurringEventResponseModalProps> = ({
  visible,
  onClose,
  onThisEventOnly,
  onAllFutureEvents,
  eventTitle,
  newStatus
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const getStatusText = () => {
    switch (newStatus) {
      case 'accepted': return 'accept';
      case 'maybe': return 'mark as maybe';
      case 'rejected': return 'decline';
      default: return 'update';
    }
  };

  const getStatusColor = () => {
    switch (newStatus) {
      case 'accepted': return themeColors.mountainGreen;
      case 'maybe': return '#f59e0b';
      case 'rejected': return themeColors.specialRed;
      default: return themeColors.tint;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
      }}>
        <View style={{
          backgroundColor: themeColors.background,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: themeColors.mountainGreen,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Feather 
                name="repeat" 
                size={24} 
                color="white" 
              />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: themeColors.text,
              textAlign: 'center',
            }}>
              Recurring Event
            </Text>
          </View>

          {/* Options */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={onThisEventOnly}
              style={{
                borderRadius: 12,
                padding: 12,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <LinearGradient
                colors={[themeColors.cardColorsGradientOne, themeColors.cardColorsGradientTwo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 12,
                  opacity: 0.9,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.mountainGreen,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Feather name="calendar" size={18} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: themeColors.text,
                  }}>
                    This event only
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={themeColors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAllFutureEvents}
              style={{
                borderRadius: 12,
                padding: 12,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <LinearGradient
                colors={[themeColors.cardColorsGradientOne, themeColors.cardColorsGradientTwo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 12,
                  opacity: 0.9,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.mountainGreen,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Feather name="repeat" size={18} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: themeColors.text,
                  }}>
                    All future events
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={themeColors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: 'transparent',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: themeColors.textSecondary,
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default RecurringEventResponseModal; 