import React from 'react';
import { Modal, View, Text, TouchableOpacity, Alert } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

interface RecurringEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: 'this_only' | 'this_and_future' | 'all_instances') => void;
  eventTitle: string;
  occurrenceDate: Date;
}

const RecurringEventModal: React.FC<RecurringEventModalProps> = ({
  visible,
  onClose,
  onSelectOption,
  eventTitle,
  occurrenceDate
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleOptionSelect = (option: 'this_only' | 'this_and_future' | 'all_instances') => {
    onSelectOption(option);
    onClose();
  };

  const options = [
    {
      key: 'this_only' as const,
      title: 'This event only',
      description: `Only modify the event on ${format(occurrenceDate, 'MMMM d, yyyy')}`,
      icon: 'calendar' as const
    },
    {
      key: 'this_and_future' as const,
      title: 'This and future events',
      description: `Modify this event and all future occurrences`,
      icon: 'arrow-right' as const
    },
    {
      key: 'all_instances' as const,
      title: 'All events in the series',
      description: `Modify all occurrences of this recurring event`,
      icon: 'repeat' as const
    }
  ];

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
        paddingHorizontal: 20
      }}>
        <ThemedView style={{
          backgroundColor: themeColors.background,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <Feather name="edit-3" size={24} color={themeColors.tint} />
            <ThemedText style={{
              fontSize: 20,
              fontWeight: 'bold',
              marginLeft: 12,
              flex: 1
            }}>
              Edit Recurring Event
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={themeColors.placeholderTextColor} />
            </TouchableOpacity>
          </View>

          {/* Event info */}
          <View style={{
            backgroundColor: themeColors.background,
            borderRadius: 8,
            padding: 12,
            marginBottom: 20
          }}>
            <ThemedText style={{
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 4
            }}>
              {eventTitle}
            </ThemedText>
            <ThemedText style={{
              fontSize: 14,
              color: themeColors.placeholderTextColor
            }}>
              {format(occurrenceDate, 'EEEE, MMMM d, yyyy')}
            </ThemedText>
          </View>

          {/* Description */}
          <ThemedText style={{
            fontSize: 16,
            marginBottom: 20,
            color: themeColors.text
          }}>
            This is a recurring event. What would you like to edit?
          </ThemedText>

          {/* Options */}
          <View style={{ gap: 12 }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleOptionSelect(option.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: themeColors.inputBackgroundColor,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: themeColors.border
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.tint + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12
                }}>
                  <Feather name={option.icon} size={20} color={themeColors.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 2
                  }}>
                    {option.title}
                  </ThemedText>
                  <ThemedText style={{
                    fontSize: 14,
                    color: themeColors.placeholderTextColor
                  }}>
                    {option.description}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color={themeColors.placeholderTextColor} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 20,
              padding: 16,
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: themeColors.border
            }}
          >
            <ThemedText style={{
              fontSize: 16,
              fontWeight: '600',
              color: themeColors.placeholderTextColor
            }}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
};

export default RecurringEventModal; 