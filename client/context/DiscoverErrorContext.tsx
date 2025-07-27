import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DiscoverErrorState {
  nearbyEvents: boolean;
  friendsEvents: boolean;
  recommendedEvents: boolean;
  search: boolean;
}

interface DiscoverErrorContextType {
  errors: DiscoverErrorState;
  setComponentError: (component: keyof DiscoverErrorState, hasError: boolean) => void;
  clearAllErrors: () => void;
  hasAnyError: boolean;
  showCachedDataWarning: boolean;
  setShowCachedDataWarning: (show: boolean) => void;
}

const DiscoverErrorContext = createContext<DiscoverErrorContextType | null>(null);

export const useDiscoverError = () => {
  const context = useContext(DiscoverErrorContext);
  if (!context) {
    throw new Error('useDiscoverError must be used within DiscoverErrorProvider');
  }
  return context;
};

interface DiscoverErrorProviderProps {
  children: ReactNode;
}

export const DiscoverErrorProvider: React.FC<DiscoverErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<DiscoverErrorState>({
    nearbyEvents: false,
    friendsEvents: false,
    recommendedEvents: false,
    search: false,
  });
  
  const [showCachedDataWarning, setShowCachedDataWarning] = useState(true);

  const setComponentError = useCallback((component: keyof DiscoverErrorState, hasError: boolean) => {
    setErrors(prev => ({
      ...prev,
      [component]: hasError
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      nearbyEvents: false,
      friendsEvents: false,
      recommendedEvents: false,
      search: false,
    });
  }, []);

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <DiscoverErrorContext.Provider 
      value={{ 
        errors, 
        setComponentError, 
        clearAllErrors, 
        hasAnyError,
        showCachedDataWarning,
        setShowCachedDataWarning
      }}
    >
      {children}
    </DiscoverErrorContext.Provider>
  );
};