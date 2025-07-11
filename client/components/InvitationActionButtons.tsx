import React from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';

interface InvitationActionButtonsProps {
  onAccept: () => void;
  onMaybe: () => void;
  onDecline: () => void;
  loading?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

const InvitationActionButtons: React.FC<InvitationActionButtonsProps> = ({
  onAccept,
  onMaybe,
  onDecline,
  loading = false,
  containerStyle,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const buttonBaseStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.eventCardBackgroundColor,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  } as ViewStyle;

  const iconCommonProps = { size: 11, color: themeColors.text, style: { marginRight: 4 } } as const;

  return (
    <View style={[{ flexDirection: 'row', gap: 6 }, containerStyle]}>
      <TouchableOpacity
        onPress={onAccept}
        disabled={loading}
        style={[buttonBaseStyle, { opacity: loading ? 0.6 : 1 }]}
      >
        <Feather name="check" {...iconCommonProps} />
        <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>
          Accept
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMaybe}
        disabled={loading}
        style={[buttonBaseStyle, { opacity: loading ? 0.6 : 1 }]}
      >
        <MaterialIcons name="question-mark" {...iconCommonProps} />
        <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>
          Maybe
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDecline}
        disabled={loading}
        style={[buttonBaseStyle, { opacity: loading ? 0.6 : 1 }]}
      >
        <Feather name="x" {...iconCommonProps} />
        <ThemedText style={{ fontSize: 11, fontWeight: '600', color: themeColors.text }}>
          Decline
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export default InvitationActionButtons; 