import React, { useState, useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import EventImage from '@/components/CreateEvent/EventImage';
import Category from '@/components/CreateEvent/EventType';
import Description from '@/components/CreateEvent/Description';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { CreateEventTabParamList } from '@/types/allTypes';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { CreateEventScrollContext } from './_layout';
import Animated, { useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

export default React.memo(function EventDetails() {
  const navigation = useNavigation<NavigationProp<CreateEventTabParamList>>();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [eventType, setEventType] = useState<string | undefined>(undefined);
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
    navigation.navigate('Date & Location');
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <AnimatedKeyboardAwareScrollView
        contentContainerStyle={{ gap: 16 }}
        bottomOffset={40}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={true}
      >
        {/* Step 1: Event Details */}
        <ThemedView style={{ alignItems: 'center', marginVertical: 8 }}>
          <EventImage eventType={eventType} />
        </ThemedView>
        <ThemedView style={{ paddingHorizontal: 16 }}>
          <EventName />
        </ThemedView>
        <ThemedView style={{ paddingHorizontal: 16 }}>
          <Category onCategorySelect={setEventType} />
        </ThemedView>
        <ThemedView style={{ paddingHorizontal: 16 }}>
          <Description />
        </ThemedView>

        {/* Next Button */}
        <ThemedView style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <ButtonWithLabel 
            label="Next"
            onPress={navigateToNext}
            containerStyle={{ 
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignSelf: 'flex-end',
            }}
            textStyle={{
              fontWeight: 'bold',
              color: 'white'
            }}
          />
        </ThemedView>
      </AnimatedKeyboardAwareScrollView>
    </ThemedView>
  );
});