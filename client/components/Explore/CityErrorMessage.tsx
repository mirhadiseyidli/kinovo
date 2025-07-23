import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { CityErrorState } from '@/context/CityErrorContext';

interface CityErrorMessageProps {
  errors: CityErrorState;
  showCachedDataWarning?: boolean;
  cityName?: string;
}

export const CityErrorMessage: React.FC<CityErrorMessageProps> = ({ 
  errors, 
  showCachedDataWarning = true,
  cityName = 'city'
}) => {
  // Count how many components have errors
  const errorCount = Object.values(errors).filter(Boolean).length;
  
  if (errorCount === 0) return null;

  // Build error message based on which components failed
  const getErrorMessage = () => {
    const failedComponents: string[] = [];
    
    if (errors.events) failedComponents.push('events');
    if (errors.cityInfo) failedComponents.push('city info');

    if (errorCount === 2) {
      return `Unable to load ${cityName} events and city info`;
    } else if (errors.events) {
      return `Unable to load ${cityName} events`;
    } else if (errors.cityInfo) {
      return `Unable to load city info`;
    } else {
      return 'Unable to load data';
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