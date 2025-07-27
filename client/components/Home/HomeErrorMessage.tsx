import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

export interface HomeErrorState {
  upcomingEvents: boolean;
  attentionRequired: boolean;
  pastEvents: boolean;
}

interface HomeErrorMessageProps {
  errors: HomeErrorState;
  showCachedDataWarning?: boolean;
}

export const HomeErrorMessage: React.FC<HomeErrorMessageProps> = ({ errors, showCachedDataWarning = true }) => {
  // Count how many components have errors
  const errorCount = Object.values(errors).filter(Boolean).length;
  
  if (errorCount === 0) return null;

  // Build error message based on which components failed
  const getErrorMessage = () => {
    const failedComponents: string[] = [];
    
    if (errors.upcomingEvents) failedComponents.push('upcoming events');
    if (errors.attentionRequired) failedComponents.push('attention required');
    if (errors.pastEvents) failedComponents.push('past events');

    if (errorCount === 3) {
      return 'Unable to load all data';
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