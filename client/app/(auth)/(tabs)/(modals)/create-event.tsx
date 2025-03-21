import { StyleSheet, Image, StatusBar, Modal, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import DiscoverScreen from '@/components/Explore/Discover';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import CreateEvent from '@/components/CreateEvent/CreateEvent';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';

export default function Create({ visible, onRequestClose }: { visible: boolean; onRequestClose: () => void }) {
  return (
    <ThemedView style={{ flex: 1 }}>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle='formSheet'
        onRequestClose={onRequestClose}
      >
        <ThemedView style={{ flex: 1, paddingTop: 8 }}>
          <CreateEvent />
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}
