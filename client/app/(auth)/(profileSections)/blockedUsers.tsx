import React, { useEffect, useState } from 'react';
import { TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, View, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import api from '@/utils/api';

interface BlockedUser {
  _id: string;
  username: string;
  full_name: string;
  profile_picture?: string | null;
}

const BlockedUsers = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const response = await api.get('/api/users/blocked');
      setBlockedUsers(response.data.blockedUsers || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    Alert.alert(
      "Unblock User",
      "Are you sure you want to unblock this user?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post('/api/users/unblock', { userId });
              // Remove the unblocked user from the list
              setBlockedUsers(prev => prev.filter(user => user._id !== userId));
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  };

  const truncateName = (name: string, maxLength: number) => {
    if (!name) return '';
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Blocked Users',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={router.back}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={themeColors.mountainGreen} />
        ) : blockedUsers.length === 0 ? (
          <View style={{ 
            alignItems: 'center',
            backgroundColor: themeColors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: themeColors.border,
            width: '100%',
            minHeight: 120,
            justifyContent: 'center'
          }}>
            <View style={{ marginBottom: 12 }}>
              <Feather
                name="user-x"
                size={32}
                color={themeColors.placeholderTextColor}
              />
            </View>
            <ThemedText 
              style={{ 
                fontSize: 16, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                marginBottom: 4,
                fontWeight: '600'
              }}
            >
              No blocked users
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              You haven't blocked any users yet
            </ThemedText>
          </View>
        ) : (
          blockedUsers.map((user) => (
            <View
              key={user._id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Image
                  source={user.profile_picture ? { uri: user.profile_picture } : require('@/assets/profile-pic-2.jpeg')}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                />
                <View style={{ flexDirection: 'column' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', color: themeColors.text }}>{user.full_name}</Text>
                  </View>
                  {user.username && (
                    <Text style={{ color: themeColors.placeholderTextColor, marginTop: 2 }}>
                      @{truncateName(user.username, 18)}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleUnblock(user._id)}
                style={{
                  backgroundColor: themeColors.inputBackgroundColor,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default BlockedUsers; 