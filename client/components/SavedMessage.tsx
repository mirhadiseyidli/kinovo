import React from 'react';
import { View, Text, TextInput, Dimensions, Image, TouchableOpacity } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const SavedMessage = ({
  visible = false
}: {
  visible?: boolean;
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  return (
    // Saved Message
    visible && (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: screenHeight,
        width: screenWidth,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
      }}>
        <View style={{
          backgroundColor: 'rgba(50, 50, 50, 0.8)',
          padding: 25,
          borderRadius: 10,
        }}>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>Saved!</Text>
        </View>
      </View>
    )
  );
};

export default SavedMessage;