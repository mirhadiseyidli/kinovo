import React, { useState, useEffect } from 'react';
import { ScrollView, View, RefreshControl, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGetAttentionRequiredEvents } from '@/hooks/useGetAttentionRequiredEvents';
import { Event } from '@/types/allTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import AttentionRequiredCard from '@/components/Home/AttentionRequired';

export default function AttentionRequiredScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [attentionEvents, setAttentionEvents] = useState<Event[]>([]);
  const { fetchAttentionRequiredEvents } = useGetAttentionRequiredEvents();
  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const events = await fetchAttentionRequiredEvents();
      if (events && Array.isArray(events)) {
        setAttentionEvents(events);
      }
    } catch (error) {
      console.error('Failed to fetch attention required events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchEvents();
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
          headerTitle: 'Attention Required',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity onPress={goBack}>
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView 
        style={{ flex: 1, padding: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
      >
        {/* Header Card */}
        <ThemedView 
          style={{ 
            backgroundColor: themeColors.maybeStatusColor, // Using the pending color
            padding: 16,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <MaterialCommunityIcons 
              name="clock-alert" 
              size={48} 
              color="white" 
              style={{ marginBottom: 8 }}
            />
            <ThemedText style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: 4,
              textAlign: 'center'
            }}>
              Events Needing Response
            </ThemedText>
          </View>
        </ThemedView>

        {/* Events Section */}
        <ThemedView style={{ paddingVertical: 16 }}>
          <ThemedView style={{ 
            marginBottom: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
              Attention Required
            </ThemedText>
            <ThemedText style={{ color: themeColors.textSecondary }}>
              {attentionEvents.length} events
            </ThemedText>
          </ThemedView>

          {/* Events List */}
          {attentionEvents.length === 0 ? (
            <View style={{
              padding: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{ marginBottom: 12 }}>
                <IconSymbol
                  name="checkmark.circle"
                  size={32}
                  color={themeColors.placeholderTextColor}
                />
              </View>
              <ThemedText style={{ 
                fontSize: 16, 
                textAlign: 'center',
                color: themeColors.textSecondary,
                marginBottom: 8,
              }}>
                All caught up!
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                textAlign: 'center',
                color: themeColors.textThird,
              }}>
                No events need your attention right now
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {attentionEvents.map((event) => (
                <AttentionRequiredCard
                  key={event._id}
                  refreshing={refreshing}
                  onFinishRefresh={() => setRefreshing(false)}
                  initialEvents={[event]}
                  showHeader={false}
                />
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
} 