import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { DiscoverErrorState } from '@/context/DiscoverErrorContext';

interface DiscoverErrorMessageProps {
  errors: DiscoverErrorState;
  showCachedDataWarning?: boolean;
}

export const DiscoverErrorMessage: React.FC<DiscoverErrorMessageProps> = ({ errors, showCachedDataWarning = true }) => {
  // Count how many components have errors
  const errorCount = Object.values(errors).filter(Boolean).length;
  
  if (errorCount === 0) return null;

  // Build error message based on which components failed
  const getErrorMessage = () => {
    const failedComponents: string[] = [];
    
    if (errors.nearbyEvents) failedComponents.push('nearby events');
    if (errors.friendsEvents) failedComponents.push('friends\' events');
    if (errors.recommendedEvents) failedComponents.push('recommendations');
    if (errors.search) failedComponents.push('search');

    if (errorCount >= 4) {
      return 'Unable to load most data';
    } else if (errorCount === 3) {
      return `Unable to load ${failedComponents.slice(0, 2).join(', ')} and ${failedComponents[2]}`;
    } else if (errorCount === 2) {
      return `Unable to load ${failedComponents.join(' and ')}`;
    } else {
      return `Unable to load ${failedComponents[0]}`;
    }
  };

  const message = getErrorMessage();
  const fullMessage = showCachedDataWarning 
    ? `⚠️ ${message}. Showing cached data - pull to refresh to retry`
    : `⚠️ ${message} - pull to refresh to retry`;

  return (
    <View style={{
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 193, 7, 0.3)',
    }}>
      <ThemedText style={{ 
        color: '#f59e0b',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center'
      }}>
        {fullMessage}
      </ThemedText>
    </View>
  );
};