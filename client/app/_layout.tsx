import AuthProvider from "@/components/Auth/AuthProvider";
import { Slot } from "expo-router";
import { ReactNode, useState, useEffect } from "react";
import { View, Image, ActivityIndicator, Animated, Dimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from "@/components/ThemedText";

SplashScreen.preventAutoHideAsync(); // Prevent splash from auto-hiding

export default function RootLayout(): ReactNode {
  SplashScreen.hideAsync(); // Hide splash screen after animation
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const logoFadeAnim = useState(new Animated.Value(1))[0]; // Initial opacity for logo
  const loadingFadeAnim = useState(new Animated.Value(1))[0]; // Initially visible
  const screenFadeAnim = useState(new Animated.Value(0))[0]; // Fade-in for the main app
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark']; // Get theme colors dynamically
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    // Start logo fade-out
    setTimeout(() => {
      Animated.timing(logoFadeAnim, {
        toValue: 0,
        duration: 500, // Smooth fade-out for the logo
        useNativeDriver: true,
      }).start(() => {
        setIsLogoLoaded(true); // Mark logo as loaded
        
        // Keep loading indicator visible and prevent blank screen
        setTimeout(() => {
          Animated.timing(loadingFadeAnim, {
            toValue: 0,
            duration: 500, // Fade-out loading indicator
            useNativeDriver: true,
          }).start(() => {
            setIsLoaded(true);
            Animated.timing(screenFadeAnim, {
              toValue: 1,
              duration: 500, // Fade-in app content
              useNativeDriver: true,
            }).start();
          });
        }, 1500); // Ensure loading indicator remains visible for enough time
      });
    }, 1500); // Keep logo visible for a short while before fading
  }, []);

  if (!isLoaded) {
    return (
      <View 
        style={{ 
          flex: 1, 
          backgroundColor: themeColors.background, 
          justifyContent: "center", 
          alignItems: "center",
        }}
      >
        {/* Logo Transition */}
        {!isLogoLoaded && (
          <Animated.View style={{ opacity: logoFadeAnim, alignItems: "center", justifyContent: 'center' }}>
            <Image source={require('@/assets/logo_2.png')} style={{ width: width * 0.5, height: width * 0.5, resizeMode: "contain" }} />
            <ThemedText style={{ fontSize: 40, fontFamily: 'Didot', fontWeight: 'bold', alignSelf: 'center' }}>Kinovo</ThemedText>
          </Animated.View>
        )}

        {/* Loading Indicator Transition */}
        {isLogoLoaded && !isLoaded && (
          <Animated.View style={{ opacity: loadingFadeAnim }}>
            <ActivityIndicator size="large" color={themeColors.text} />
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <AuthProvider>
      <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
        <Slot />
      </Animated.View>
    </AuthProvider>
  );
}