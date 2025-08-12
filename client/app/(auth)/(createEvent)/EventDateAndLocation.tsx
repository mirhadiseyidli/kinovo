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
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { useRouter } from 'expo-router';
import LocationSuggestionsDropdown from '@/components/CreateEvent/LocationSuggestionsDropdown'

const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

export default React.memo(function EventDateAndLocation() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputPosition, setInputPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const locationSelectRef = useRef<((text: string, city: string, state: string, location: any) => void) | null>(null);
  
  // Refs to control all pickers - only one can be open at a time
  const dateTimeRef = useRef<{
    closeStartPicker: () => void;
    closeEndPicker: () => void;
    openStartPicker: () => void;
    openEndPicker: () => void;
  } | null>(null);
  
  const frequencyRef = useRef<{
    closeRepeatPicker: () => void;
    closeEndOnPicker: () => void;
    openRepeatPicker: () => void;
    openEndOnPicker: () => void;
  } | null>(null);
  
  // Callback to manage exclusive picker behavior
  const handlePickerOpen = (pickerType: 'startTime' | 'endTime' | 'repeat' | 'endOn') => {
    // Close all other pickers first
    if (dateTimeRef.current) {
      if (pickerType !== 'startTime') dateTimeRef.current.closeStartPicker();
      if (pickerType !== 'endTime') dateTimeRef.current.closeEndPicker();
    }
    if (frequencyRef.current) {
      if (pickerType !== 'repeat') frequencyRef.current.closeRepeatPicker();
      if (pickerType !== 'endOn') frequencyRef.current.closeEndOnPicker();
    }
  };
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
      {/* Full screen backdrop when suggestions are showing */}
      {showSuggestions && inputPosition && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 999,
          }}
          onPress={handleBackdropPress}
        />
      )}

      <AnimatedScrollView 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps={'always'}
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        scrollEnabled={!showSuggestions}
        onScroll={scrollHandler}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={true}
      >
        {/* Step 2: Date & Location */}
        <DateTime ref={dateTimeRef} onPickerOpen={handlePickerOpen} />
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
          onInputPositionChange={setInputPosition}
        />
        <Frequency ref={frequencyRef} onPickerOpen={handlePickerOpen} />
        
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

      {/* Location Suggestions Dropdown - Positioned based on input location */}
      {showSuggestions && suggestions.length > 0 && inputPosition && (
        <LocationSuggestionsDropdown
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onLocationSelect={handleLocationSelect}
          inputPosition={inputPosition}
        />
      )}
    </ThemedView>
  );
});