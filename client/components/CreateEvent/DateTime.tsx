import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';

const DateTime: React.FC = () => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ marginBottom: 24 }}>
      {/* <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Date & Time</ThemedText> */}
      <ThemedView
        style={{
          alignSelf: 'center',
          paddingVertical: 16,
          paddingHorizontal: 20,
          width: '100%',
          borderRadius: 8,
          backgroundColor: themeColors.inputBackgroundColor,
          elevation: 5,
        }}
      >
        {/* Dotted Line */}
        <View
          style={{
            position: 'absolute',
            top: 35,
            bottom: 12,
            left: 25, // Position near the circles
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '40%'
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={{
                width: 1,
                height: 4,
                backgroundColor: themeColors.placeholderTextColor,
                marginBottom: 2,
              }}
            />
          ))}
        </View>

        {/* Start Date & Time */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Feather
            name="circle"
            size={12}
            color={themeColors.placeholderTextColor}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: themeColors.placeholderTextColor,
              marginRight: 12,
            }}
          >
            Start
          </Text>
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: '400',
              flex: 1,
              textAlign: 'right',
              color: '#007AFF'
            }}
          >
            Sun, Feb 2 at 11:00 AM
          </ThemedText>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: themeColors.placeholderTextColor,
            opacity: 0.2,
            marginBottom: 16,
            marginLeft: 22, // Align divider with "Start" and "End" text
          }}
        />

        {/* End Date & Time */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Feather
            name="circle"
            size={12}
            color={themeColors.placeholderTextColor}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: themeColors.placeholderTextColor,
              marginRight: 12,
            }}
          >
            End
          </Text>
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: '400',
              flex: 1,
              textAlign: 'right',
              color: '#007AFF'
            }}
          >
            Sun, Feb 2 at 12:00 PM
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default DateTime;