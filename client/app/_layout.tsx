import AuthProvider, { useAuthSession } from "@/components/Auth/AuthProvider";
import { Slot } from "expo-router";
import { ReactNode, useState, useEffect, useCallback } from "react";
import { View, Image, ActivityIndicator, Animated, Dimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import KinovoSplash from "@/components/KinovoSplash";
import HomePageLoadingSkeleton from "@/components/LoadingSkeletons/HomePageLoadingSkeleton";

export default function RootLayout(): JSX.Element {
  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
  );
}

function InnerLayout(): JSX.Element {
  const { isLoading } = useAuthSession();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [minimumSkeletonShown, setMinimumSkeletonShown] = useState(false);
  const logoFadeAnim = useState(new Animated.Value(1))[0];
  const loadingFadeAnim = useState(new Animated.Value(1))[0];
  const screenFadeAnim = useState(new Animated.Value(0))[0];
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
      const timeout = setTimeout(() => {
        setMinimumSkeletonShown(true);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isLogoLoaded]);

  useEffect(() => {
    if (isLogoLoaded) {
      Animated.timing(logoFadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setIsLoaded(true);
      });
    }
  }, [isLogoLoaded]);

  useEffect(() => {
    if (!isLoading && minimumSkeletonShown) {
      setAppIsReady(true);
    }
  }, [isLoading, minimumSkeletonShown]);

  useEffect(() => {
    if (isLoaded && appIsReady) {
      Animated.timing(loadingFadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(screenFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isLoaded, appIsReady]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  return (
    !appIsReady ? (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
        onLayout={onLayoutRootView}
      >
        {!isLogoLoaded && (
          <Animated.View style={{ opacity: logoFadeAnim, width: "100%", height: "100%" }}>
            <KinovoSplash />
          </Animated.View>
        )}
        {isLogoLoaded && !appIsReady && (
          <Animated.View style={{ opacity: loadingFadeAnim, width: "100%", height: "100%" }}>
            <HomePageLoadingSkeleton />
          </Animated.View>
        )}
      </View>
    ) : (
      <Animated.View style={{ flex: 1, opacity: screenFadeAnim }} onLayout={onLayoutRootView}>
        <Slot />
      </Animated.View>
    )
  );
}