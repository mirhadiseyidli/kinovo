import React, { useState, useEffect, useCallback } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import FriendsList from '@/app/(auth)/(manageFriends)/YourFriends';
import FriendRequests from '@/app/(auth)/(manageFriends)/FriendRequests';
import AddFriends, { AddFriendsRef } from '@/app/(auth)/(manageFriends)/AddFriends';
import Tags, { TagsRef } from '@/app/(auth)/(manageFriends)/Tags';
import { Stack, useRouter, usePathname } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Feather } from '@expo/vector-icons';
import { BannerProvider } from '@/context/BannerContext';

const Tab = createMaterialTopTabNavigator();

export default function ManageFriendsTabs() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<string>('Add Friends');
  const tagsRef = React.useRef<TagsRef>(null);
  const addFriendsRef = React.useRef<AddFriendsRef>(null);

  const TagsScreen = React.useCallback(() => {
    return <Tags ref={tagsRef} />;
  }, []);

  const AddFriendsScreen = React.useCallback(() => {
    return <AddFriends ref={addFriendsRef} />;
  }, []);

  const RequestsScreen = React.useCallback(() => {
    return <FriendRequests />;
  }, []);

  const FriendsScreen = React.useCallback(() => {
    return <FriendsList />;
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  useEffect(() => {
    const tabName = pathname.split('/').pop()?.replace(/%20/g, ' ') ?? '';
    setTab(tabName);
  }, [pathname]);

  const tagsHeaderRight = useCallback(() => {
    return () => (
      <TouchableOpacity
        onPress={() => {
          if (tagsRef.current) {
            tagsRef.current.setShowCreateModal(true);
          }
        }}
      >
        <IconSymbol name="plus.circle" size={24} color={themeColors.text} />
      </TouchableOpacity>
    );
  }, [themeColors.text]);

  const addFriendsHeaderRight = useCallback(() => {
    return () => (
      <TouchableOpacity
        onPress={() => {
          if (addFriendsRef.current) {
            addFriendsRef.current.openInviteModal();
          }
        }}
      >
        <Feather name="user-plus" size={24} color={themeColors.text} />
      </TouchableOpacity>
    );
  }, [themeColors.text]);

  const getHeaderRight = () => {
    switch (tab) {
      case 'Tags':
        return tagsHeaderRight();
  
      case 'Add Friends':
        return addFriendsHeaderRight();

      case 'AddFriends':
        return addFriendsHeaderRight();
    
      default:
        return undefined;
    }
  };

  return (
    <BannerProvider>
      <ThemedView style={{ flex: 1 }}>
        <Stack.Screen 
          options={{
            headerTitle: 'Manage Friends',
            headerTintColor: themeColors.text,
            headerStyle: {
              backgroundColor: themeColors.background,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={goBack}
              >
                <Feather name="chevron-left" size={24} color={themeColors.text} />
              </TouchableOpacity>
            ),
            headerRight: getHeaderRight(),
          }} 
        />
        <Tab.Navigator
          initialRouteName="Add Friends"
          backBehavior='none'
          screenOptions={{
            tabBarIndicatorStyle: { backgroundColor: Colors[colorScheme ?? 'dark'].tint },
            tabBarStyle: { backgroundColor: Colors[colorScheme ?? 'dark'].background },
            tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
            tabBarInactiveTintColor: Colors[colorScheme ?? 'dark'].placeholderTextColor,
            tabBarLabelStyle: { fontWeight: 'bold' },
          }}
        >
          <Tab.Screen 
            name="Add Friends" 
            component={AddFriendsScreen} 
            options={{ title: 'Add Friends' }} 
          />
          <Tab.Screen 
            name="Requests" 
            component={RequestsScreen} 
            options={{ title: 'Requests' }} 
          />
          <Tab.Screen 
            name="Friends" 
            component={FriendsScreen} 
            options={{ title: 'Friends' }} 
          />
          <Tab.Screen 
            name="Tags" 
            component={TagsScreen} 
            options={{ title: 'Tags' }} 
          />
        </Tab.Navigator>
      </ThemedView>
    </BannerProvider>
  );
}