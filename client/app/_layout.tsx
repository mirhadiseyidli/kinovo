import AuthProvider, { useAuthSession } from "@/components/Auth/AuthProvider";
import { Slot } from "expo-router";
import { ReactNode, useState, useEffect, useCallback } from "react";
import { View, Animated } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import KinovoSplash from "@/components/KinovoSplash";
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import { Provider } from 'react-redux';
import { store } from "@/store";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardProvider } from "react-native-keyboard-controller";

registerRootComponent(RootLayout);

export default function RootLayout() {
  return (
    <Provider store={store}>
      <KeyboardProvider>
        <AuthProvider>
          <InnerLayout />
        </AuthProvider>
      </KeyboardProvider>
    </Provider>
  );
}

function InnerLayout() {
  const { isLoading } = useAuthSession();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const logoFadeAnim = useState(new Animated.Value(1))[0];
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Delay splash screen fade out
        setTimeout(() => {
          setIsLogoLoaded(true);
        }, 1500);
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (isLogoLoaded) {
      Animated.timing(logoFadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setAppIsReady(true);
      });
    }
  }, [isLogoLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  return !appIsReady ? (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
      onLayout={onLayoutRootView}
    >
      <Animated.View style={{ opacity: logoFadeAnim, width: "100%", height: "100%" }}>
        <KinovoSplash />
      </Animated.View>
    </View>
  ) : (
    <ThemedView style={{ flex: 1 }}>
        <Slot />
    </ThemedView>
  );
}