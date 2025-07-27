import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { handleErrorBoundaryError, errorHandlingSystem } from '@/utils/errorHandling';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component with Global Error Handling Integration
 * 
 * This component catches JavaScript errors anywhere in the component tree
 * and integrates with the global error handling system for proper logging
 * and telemetry.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Log to global error handling system
    handleErrorBoundaryError(error, { componentStack: errorInfo.componentStack || '' });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console for development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleShowDetails = () => {
    if (this.state.error) {
      const errorDetails = {
        message: this.state.error.message,
        stack: this.state.error.stack,
        componentStack: this.state.errorInfo?.componentStack,
      };
      
      Alert.alert(
        'Error Details',
        JSON.stringify(errorDetails, null, 2),
        [{ text: 'OK' }]
      );
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Default error UI
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: '#f5f5f5',
        }}>
          <View style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 10,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#d32f2f',
              textAlign: 'center',
              marginBottom: 10,
            }}>
              🚨 Something went wrong
            </Text>

            <Text style={{
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              marginBottom: 20,
            }}>
              An unexpected error occurred. The error has been logged and reported.
            </Text>

            {this.state.error && (
              <ScrollView style={{
                backgroundColor: '#f8f8f8',
                padding: 10,
                borderRadius: 5,
                marginBottom: 20,
                maxHeight: 150,
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#333',
                  fontFamily: 'monospace',
                }}>
                  {this.state.error.message}
                </Text>
              </ScrollView>
            )}

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#2196F3',
                  padding: 12,
                  borderRadius: 5,
                  alignItems: 'center',
                }}
                onPress={this.handleRetry}
              >
                <Text style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}>
                  Try Again
                </Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#666',
                    padding: 12,
                    borderRadius: 5,
                    alignItems: 'center',
                  }}
                  onPress={this.handleShowDetails}
                >
                  <Text style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}>
                    Show Details
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {__DEV__ && (
              <Text style={{
                fontSize: 10,
                color: '#999',
                textAlign: 'center',
                marginTop: 10,
              }}>
                Error ID: {this.state.error ? `app-${Date.now()}` : 'Unknown'}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of ErrorBoundary for functional components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    const info = errorInfo || { componentStack: '' };
    handleErrorBoundaryError(error, { componentStack: info.componentStack || '' });
  }, []);

  return { handleError };
};

/**
 * HOC version of ErrorBoundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;