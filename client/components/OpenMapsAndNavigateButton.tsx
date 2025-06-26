import React from 'react';
import { TouchableOpacity, Alert, Linking } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import LinearGradient from 'react-native-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Feather, Octicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OpenMapsAndNavigateButtonProps } from '@/types/allTypes';

const OpenMapsAndNavigateButton = ({ selectedLocation, latitude, longitude }: OpenMapsAndNavigateButtonProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={{
        backgroundColor: themeColors.background,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }}
      onPress={() => {
        console.log('Button pressed!'); // Debug log
        Alert.alert(
          "Navigate",
          `Do you want to get directions to "${selectedLocation}"?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Apple Maps",
              onPress: () => {
                const url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
                Linking.openURL(url);
              },
            },
            {
              text: "Google Maps",
              onPress: () => {
                const url = `http://maps.google.com/?daddr=${latitude},${longitude}`;
                Linking.openURL(url);
              },
            },
          ]
        );
      }}
    >
      <FontAwesome name="location-arrow" size={24} color={themeColors.text} />
    </TouchableOpacity>
  );
};

export default React.memo(OpenMapsAndNavigateButton);