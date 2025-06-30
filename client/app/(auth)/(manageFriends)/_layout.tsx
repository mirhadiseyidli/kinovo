import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import FriendsList from '@/app/(auth)/(manageFriends)/YourFriends';
import FriendRequests from '@/app/(auth)/(manageFriends)/FriendRequests';
import AddFriends from '@/app/(auth)/(manageFriends)/AddFriends';
import Tags, { TagsRef } from '@/app/(auth)/(manageFriends)/Tags';
import { Stack, useRouter, usePathname } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Feather } from '@expo/vector-icons';

const Tab = createMaterialTopTabNavigator();

export default function ManageFriendsTabs() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const pathname = usePathname();

  const isTagsTab = pathname.includes('Tags');
  const tagsRef = React.useRef<TagsRef>(null);

  const TagsScreen = React.useCallback(() => {
    return <Tags ref={tagsRef} />;
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
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
          headerRight: isTagsTab ? () => (
            <TouchableOpacity
              onPress={() => {
                if (tagsRef.current) {
                  tagsRef.current.setShowCreateModal(true);
                }
              }}
            >
              <IconSymbol name="plus.circle" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ) : undefined,
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
          component={AddFriends} 
          options={{ title: 'Add Friends' }} 
        />
        <Tab.Screen 
          name="Requests" 
          component={FriendRequests} 
          options={{ title: 'Requests' }} 
        />
        <Tab.Screen 
          name="Friends" 
          component={FriendsList} 
          options={{ title: 'Friends' }} 
        />
        <Tab.Screen 
          name="Tags" 
          component={TagsScreen} 
          options={{ title: 'Tags' }} 
        />
      </Tab.Navigator>
    </ThemedView>
  );
}