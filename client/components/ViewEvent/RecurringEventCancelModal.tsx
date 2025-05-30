import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface RecurringEventCancelModalProps {
  visible: boolean;
  onClose: () => void;
  onThisEventOnly: () => void;
  onAllFutureEvents: () => void;
  eventTitle: string;
}

const RecurringEventCancelModal: React.FC<RecurringEventCancelModalProps> = ({
  visible,
  onClose,
  onThisEventOnly,
  onAllFutureEvents,
  eventTitle
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

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
              backgroundColor: themeColors.specialRed,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Feather 
                name="x-octagon" 
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
              Cancel Recurring Event
            </Text>
          </View>

          {/* Event Title */}
          <View style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: themeColors.text,
              textAlign: 'center',
            }}>
              {eventTitle}
            </Text>
          </View>

          {/* Description */}
          <Text style={{
            fontSize: 16,
            marginBottom: 20,
            color: themeColors.text,
            textAlign: 'center',
          }}>
            This is a recurring event. What would you like to cancel?
          </Text>

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
                  backgroundColor: themeColors.specialRed,
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
                  <Text style={{
                    fontSize: 14,
                    color: themeColors.textSecondary,
                  }}>
                    Cancel only this occurrence
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
                  backgroundColor: themeColors.specialRed,
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
                  <Text style={{
                    fontSize: 14,
                    color: themeColors.textSecondary,
                  }}>
                    Cancel this and all future occurrences
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

export default RecurringEventCancelModal; 