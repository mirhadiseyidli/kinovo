import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { CategoryErrorState } from '@/context/CategoryErrorContext';

interface CategoryErrorMessageProps {
  errors: CategoryErrorState;
  showCachedDataWarning?: boolean;
  categoryName?: string;
}

export const CategoryErrorMessage: React.FC<CategoryErrorMessageProps> = ({ 
  errors, 
  showCachedDataWarning = true,
  categoryName = 'category'
}) => {
  // Count how many components have errors
  const errorCount = Object.values(errors).filter(Boolean).length;
  
  if (errorCount === 0) return null;

  // Build error message based on which components failed
  const getErrorMessage = () => {
    const failedComponents: string[] = [];
    
    if (errors.events) failedComponents.push('events');
    if (errors.categoryInfo) failedComponents.push('category info');

    if (errorCount === 2) {
      return `Unable to load ${categoryName} events and category info`;
    } else if (errors.events) {
      return `Unable to load ${categoryName} events`;
    } else if (errors.categoryInfo) {
      return `Unable to load category info`;
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