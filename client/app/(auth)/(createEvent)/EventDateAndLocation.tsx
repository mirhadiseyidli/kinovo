import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import DateTime from '@/components/CreateEvent/DateTime';
import Location from '@/components/CreateEvent/Location';
import Frequency from '@/components/CreateEvent/Frequency';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React, { useState, useRef, useContext } from 'react';
import { View, TouchableOpacity, Text, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CreateEventTabParamList, Suggestion } from '@/types/allTypes';
import { CreateEventScrollContext } from '@/context/CreateEventScrollContext';
import Animated, { useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

export default React.memo(function EventDateAndLocation() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationSelectRef = useRef<((text: string, city: string, state: string, location: any) => void) | null>(null);
  const router = useRouter();
  const { bounceCompleted, wasDraggingAtTop, isDismissing, handleDismiss } = useContext(CreateEventScrollContext);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isDismissing.value) return;
      
      const currentY = event.contentOffset.y;

      // If bounce is completed and we're pulling down again
      if (bounceCompleted.value && currentY < -50) {
        isDismissing.value = true;
        runOnJS(handleDismiss)();
      }
    },
    onBeginDrag: (event) => {
      // Reset states if starting drag from below
      if (event.contentOffset.y > 50) {
        bounceCompleted.value = false;
        wasDraggingAtTop.value = false;
      }
      // Track if we're dragging from the top
      wasDraggingAtTop.value = event.contentOffset.y <= 0;
    },
    onEndDrag: (event) => {
      // If we were dragging at the top and ended the drag
      if (wasDraggingAtTop.value) {
        bounceCompleted.value = true;
      }
    }
  });

  const navigateToNext = () => {
    navigation.navigate('Attendees & Options');
  };

  const navigateToBack = () => {
    navigation.navigate('Details');
  };

  const handleLocationSelect = (text: string, city: string, state: string, location: any) => {
    // Call the actual location selection logic from the Location component
    if (locationSelectRef.current) {
      locationSelectRef.current(text, city, state, location);
    }
  };

  const handleBackdropPress = () => {
    setShowSuggestions(false);
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
      {/* Backdrop overlay - split to avoid covering input field */}
      {showSuggestions && (
        <>
          {/* Top overlay - above input field */}
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 116, // DateTime height + gap (80px + 16px)
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          {/* Bottom overlay - below dropdown */}
          <Pressable
            style={{
              position: 'absolute',
              top: 484, // Start after dropdown area (184px + 300px max height)
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          {/* Side overlays - left and right of dropdown */}
          <Pressable
            style={{
              position: 'absolute',
              top: 96, // Start after DateTime + gap
              left: 0,
              width: 16, // Width of padding
              height: 388, // Cover input + dropdown area (58px input + 4px gap + 300px dropdown + padding)
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
          <Pressable
            style={{
              position: 'absolute',
              top: 96,
              right: 0,
              width: 16,
              height: 388,
              backgroundColor: 'transparent',
              zIndex: 999,
            }}
            onPress={handleBackdropPress}
          />
        </>
      )}

      <AnimatedScrollView 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps={'always'}
        contentContainerStyle={{ gap: 16 }}
        scrollEnabled={!showSuggestions}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={true}
      >
        {/* Step 2: Date & Location */}
        <DateTime />
        <Location 
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          onLocationSelect={() => {
            setShowSuggestions(false);
            setSuggestions([]);
          }}
          onLocationSelectRef={locationSelectRef}
        />
        <Frequency />
        
        {/* Back and Next Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <ButtonWithLabel 
            label="Back"
            onPress={navigateToBack}
            containerStyle={{ 
              backgroundColor: themeColors.inputBackgroundColor,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8
            }}
            textStyle={{
              fontWeight: 'bold',
              color: themeColors.text
            }}
          />
          <ButtonWithLabel 
            label="Next"
            onPress={navigateToNext}
            containerStyle={{ 
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
            textStyle={{
              fontWeight: 'bold',
              color: 'white'
            }}
          />
        </View>
      </AnimatedScrollView>

      {/* Location Suggestions Dropdown - Rendered outside ScrollView */}
      {showSuggestions && suggestions.length > 0 && (
        <ThemedView style={{
          position: 'absolute',
          top: 184, // DateTime (≈80px) + gap (16px) + Location input (≈58px) + spacing (4px) + ScrollView content padding
          left: 16,
          right: 16,
          backgroundColor: themeColors.inputBackgroundColor,
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: 8,
          maxHeight: 300,
          zIndex: 1000,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <ScrollView 
            style={{ maxHeight: 300 }} 
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
                onPress={() => handleLocationSelect(
                  item?.displayName?.text || '',
                  item?.postalAddress?.locality || '',
                  item?.postalAddress?.administrativeArea || '',
                  item?.location,
                )}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: themeColors.background,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Feather 
                    name="map-pin" 
                    size={20} 
                    color={themeColors.text} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontWeight: '600', 
                    fontSize: 16, 
                    color: themeColors.text 
                  }}>
                    {item['displayName']['text']}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    color: themeColors.placeholderTextColor 
                  }}>
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
        </ThemedView>
      )}
    </ThemedView>
  );
});