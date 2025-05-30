import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, ActionSheetIOS, Alert, Platform, Animated, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useCreateEventContext } from '@/context/CreateEventContext';
import AnimatedCheckBox from '../AnimatedCheckBox';

const Options: React.FC<{ setLimit: (value: number | null) => void }> = ({ setLimit }) => {
  const screenWidth = Dimensions.get('window').width;
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [visibility, setVisibility] = useState('private');
  const [capacity, setCapacity] = useState<number | null>(null);
  const [isLimited, setIsLimited] = useState(false);
  const colorAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(0))[0];
  const { settingEventVisibility, settingEventCapacity } = useCreateEventContext();

  useEffect(() => {
    settingEventVisibility(visibility);
  }, []);

  const toggleCheck = (newValue: boolean) => {
    setIsLimited(newValue);

    if (!newValue) {
      setCapacity(null);
      settingEventCapacity(null);
      setLimit(null);
    } else if (capacity !== null && capacity > 0) {
      settingEventCapacity(capacity);
    }

    Animated.timing(slideAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    Animated.timing(colorAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themeColors.placeholderTextColor, themeColors.text],
  });

  const animatedHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  const openVisibilityOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Public', 'Private', 'Selected', 'Cancel'],
          cancelButtonIndex: 3,
          title: 'Event Visibility',
          message: 'Selected: Only invited people can see the event',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) visibilitySelection('public');
          else if (buttonIndex === 1) visibilitySelection('private');
          else if (buttonIndex === 2) visibilitySelection('selected');
        }
      );
    } else {
      Alert.alert(
        'Select Visibility', 
        'Selected: Only invited people can see the event',
        [
          { text: 'Public', onPress: () => visibilitySelection('public') },
          { text: 'Private', onPress: () => visibilitySelection('private') },
          { text: 'Selected', onPress: () => visibilitySelection('selected') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const visibilitySelection = (val: string) => {
    const lowerVal = val.toLowerCase();
    setVisibility(lowerVal);
    settingEventVisibility(lowerVal);
  };

  const onCapacityChange = (num: number) => {
    setCapacity(num);
    if (isLimited) {
      settingEventCapacity(num);
      setLimit(num);
    }
  };

  return (
      <ThemedView
        style={{
          alignSelf: 'center',
          paddingVertical: 8,
          paddingHorizontal: 20,
          width: '100%',
          borderRadius: 8,
          marginTop: 8,
          backgroundColor: themeColors.inputBackgroundColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name="eye"
              size={16}
              color={themeColors.placeholderTextColor}
              style={{ marginRight: 8 }}
            />
            <ThemedText
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: themeColors.placeholderTextColor,
                marginRight: 12,
              }}
            >
              Visibility
            </ThemedText>
          </View>
          <TouchableOpacity onPress={openVisibilityOptions}
            style={{
              backgroundColor: Colors[colorScheme ?? 'dark'].background,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>
              {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: themeColors.placeholderTextColor,
            opacity: 0.2,
            marginBottom: 8,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
          <AnimatedCheckBox
            value={isLimited}
            onValueChange={toggleCheck}
            onCheckColor={themeColors.text} // checkmark color
            tintColors={{ true: themeColors.text, false: themeColors.placeholderTextColor  }} // border color states
            style={{ height: 18, width: 18 }} // size or any custom inline style
            topContainerStyle={{ marginRight: 10 }}
          />
          <Animated.Text style={{ fontSize: 16, color: interpolatedColor }}>
            Limited Capacity
          </Animated.Text>
        </View>

        <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
          {isLimited && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name="users"
                  size={16}
                  color={themeColors.placeholderTextColor}
                  style={{ marginRight: 8 }}
                />
                <ThemedText
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: themeColors.placeholderTextColor,
                    marginRight: 12,
                  }}
                >
                  Capacity
                </ThemedText>
              </View>
              <TextInput 
                onChangeText={(num) => {
                  const numeric = num.replace(/[^0-9]/g, '');
                  onCapacityChange(numeric === '' ? 0 : parseInt(numeric, 10));
                }}
                placeholder='Number of Attendees'
                placeholderTextColor={themeColors.placeholderTextColor}
                keyboardType='numeric'
                style={{
                  backgroundColor: Colors[colorScheme ?? 'dark'].background,
                  width: 'auto',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  color: themeColors.text,
                  fontSize: 12,
                  fontWeight: 'bold',
                  textAlign: 'right'
                }}
              />
            </View>
          )}
        </Animated.View>
      </ThemedView>
  );
};

export default Options;