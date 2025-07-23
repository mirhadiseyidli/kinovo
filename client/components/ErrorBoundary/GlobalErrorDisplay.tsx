import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { 
  errorHandlingSystem, 
  GlobalError, 
  isQueryError, 
  isMutationError, 
  isNetworkError,
  isAppError 
} from '@/utils/errorHandling';

/**
 * Global Error Display Component
 * 
 * This component provides a UI for displaying and managing global errors
 * that occur throughout the application. It integrates with the global
 * error handling system to show user-friendly error messages.
 */

interface GlobalErrorDisplayProps {
  maxErrors?: number;
  showInDevelopment?: boolean;
  position?: 'top' | 'bottom';
}

export const GlobalErrorDisplay: React.FC<GlobalErrorDisplayProps> = ({
  maxErrors = 3,
  showInDevelopment = true,
  position = 'top',
}) => {
  const [errors, setErrors] = useState<GlobalError[]>([]);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [detailsModal, setDetailsModal] = useState<{
    visible: boolean;
    error: GlobalError | null;
  }>({ visible: false, error: null });

  // Don't show in production unless explicitly enabled
  if (!__DEV__ && !showInDevelopment) {
    return null;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const allErrors = errorHandlingSystem.getAllErrors();
      const recentErrors = allErrors
        .filter(error => !dismissedErrors.has(error.id))
        .filter(error => error.severity !== 'low') // Don't show low severity errors
        .slice(-maxErrors);
      
      setErrors(recentErrors);
    }, 1000);

    return () => clearInterval(interval);
  }, [dismissedErrors, maxErrors]);

  const handleDismiss = (errorId: string) => {
    setDismissedErrors(prev => new Set(prev).add(errorId));
  };

  const handleShowDetails = (error: GlobalError) => {
    setDetailsModal({ visible: true, error });
  };

  const handleCloseDetails = () => {
    setDetailsModal({ visible: false, error: null });
  };

  const handleRetry = (error: GlobalError) => {
    if (isQueryError(error)) {
      // For query errors, we could trigger a refetch
      Alert.alert('Retry', 'This would trigger a query retry');
    } else if (isMutationError(error)) {
      // For mutation errors, we could retry the mutation
      Alert.alert('Retry', 'This would retry the mutation');
    } else {
      Alert.alert('Retry', 'Retry functionality not available for this error type');
    }
  };

  const getErrorIcon = (error: GlobalError): string => {
    switch (error.type) {
      case 'query': return '🔄';
      case 'mutation': return '💾';
      case 'network': return '🌐';
      case 'app': return '⚡';
      default: return '❌';
    }
  };

  const getErrorColor = (error: GlobalError): string => {
    switch (error.severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#666';
    }
  };

  const getErrorTitle = (error: GlobalError): string => {
    switch (error.type) {
      case 'query': return 'Data Loading Error';
      case 'mutation': return 'Save Operation Failed';
      case 'network': return 'Network Error';
      case 'app': return 'Application Error';
      default: return 'Unknown Error';
    }
  };

  const getErrorDescription = (error: GlobalError): string => {
    if (isNetworkError(error)) {
      if (error.isOffline) {
        return 'You appear to be offline. Please check your connection.';
      }
      if (error.isTimeout) {
        return 'Request timed out. Please try again.';
      }
      return 'Network request failed. Please check your connection.';
    }

    if (isQueryError(error)) {
      if (error.isNetworkError) {
        return 'Failed to load data due to network issues.';
      }
      return 'Failed to load data. Please try again.';
    }

    if (isMutationError(error)) {
      if (error.canRollback) {
        return 'Save operation failed. Changes have been reverted.';
      }
      return 'Save operation failed. Please try again.';
    }

    return error.message || 'An unexpected error occurred.';
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <View style={{
        position: 'absolute',
        [position]: 60,
        left: 10,
        right: 10,
        zIndex: 1000,
        maxHeight: 300,
      }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {errors.map((error) => (
            <View
              key={error.id}
              style={{
                backgroundColor: '#fff',
                borderLeftWidth: 4,
                borderLeftColor: getErrorColor(error),
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: getErrorColor(error),
                    marginBottom: 4,
                  }}>
                    {getErrorIcon(error)} {getErrorTitle(error)}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#666',
                    lineHeight: 16,
                  }}>
                    {getErrorDescription(error)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDismiss(error.id)}
                  style={{
                    padding: 4,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#999' }}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 10,
                  color: '#999',
                }}>
                  {new Date(error.timestamp).toLocaleTimeString()}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {error.retryable && (
                    <TouchableOpacity
                      onPress={() => handleRetry(error)}
                      style={{
                        backgroundColor: '#2196F3',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}>
                        RETRY
                      </Text>
                    </TouchableOpacity>
                  )}

                  {__DEV__ && (
                    <TouchableOpacity
                      onPress={() => handleShowDetails(error)}
                      style={{
                        backgroundColor: '#666',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}>
                        DETAILS
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Error Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModal.visible}
        onRequestClose={handleCloseDetails}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 20,
            width: '100%',
            maxHeight: '80%',
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 10,
              textAlign: 'center',
            }}>
              Error Details
            </Text>

            {detailsModal.error && (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                    Type: {detailsModal.error.type}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                    Severity: {detailsModal.error.severity}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                    Timestamp: {new Date(detailsModal.error.timestamp).toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                    Retryable: {detailsModal.error.retryable ? 'Yes' : 'No'}
                  </Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                    Message:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {detailsModal.error.message}
                  </Text>
                </View>

                {detailsModal.error.stack && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                      Stack Trace:
                    </Text>
                    <ScrollView style={{
                      backgroundColor: '#f5f5f5',
                      padding: 10,
                      borderRadius: 5,
                      maxHeight: 150,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: '#333',
                      }}>
                        {detailsModal.error.stack}
                      </Text>
                    </ScrollView>
                  </View>
                )}

                {detailsModal.error.context && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>
                      Context:
                    </Text>
                    <ScrollView style={{
                      backgroundColor: '#f5f5f5',
                      padding: 10,
                      borderRadius: 5,
                      maxHeight: 150,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: '#333',
                      }}>
                        {JSON.stringify(detailsModal.error.context, null, 2)}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#2196F3',
                padding: 15,
                borderRadius: 5,
                alignItems: 'center',
                marginTop: 10,
              }}
              onPress={handleCloseDetails}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default GlobalErrorDisplay;