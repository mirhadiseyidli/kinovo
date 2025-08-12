import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { Portal } from 'react-native-portalize';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Suggestion } from '@/types/allTypes';

interface LocationSuggestionsDropdownProps {
  suggestions: Suggestion[];
  showSuggestions: boolean;
  onLocationSelect: (text: string, city: string, state: string, location: any) => void;
  inputPosition: { x: number; y: number; width: number; height: number };
}

const LocationSuggestionsDropdown: React.FC<LocationSuggestionsDropdownProps> = ({
  suggestions,
  showSuggestions,
  onLocationSelect,
  inputPosition,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Portal>
      <View
        style={{
          position: 'absolute',
          top: inputPosition.y + inputPosition.height + 4, // Position below the input
          left: inputPosition.x,
          width: inputPosition.width,
          backgroundColor: themeColors.inputBackgroundColor,
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: 8,
          maxHeight: 300,
          zIndex: 1000,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
                borderBottomColor: themeColors.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() =>
                onLocationSelect(
                  item?.displayName?.text || '',
                  item?.postalAddress?.locality || '',
                  item?.postalAddress?.administrativeArea || '',
                  item?.location
                )
              }
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: themeColors.background,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Feather name="map-pin" size={20} color={themeColors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '600',
                    fontSize: 16,
                    color: themeColors.text,
                  }}
                >
                  {item['displayName']['text']}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: themeColors.placeholderTextColor,
                  }}
                >
                  {item['formattedAddress']}
                </Text>
              </View>
              <Feather
                name="arrow-up-right"
                size={16}
                color={themeColors.placeholderTextColor}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Portal>
  );
};

export default LocationSuggestionsDropdown;