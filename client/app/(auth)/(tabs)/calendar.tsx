import { StyleSheet, Image, Platform } from 'react-native';
import React from 'react';
// import { Collapsible } from '@/components/Collapsible';
// import { ExternalLink } from '@/components/ExternalLink';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default React.memo(function Calendar() {
  return (
      <ThemedView style={styles.titleContainer}>
        <ThemedText>Explore</ThemedText>
      </ThemedView>
  );
});

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
