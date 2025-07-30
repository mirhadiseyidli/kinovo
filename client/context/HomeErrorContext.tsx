import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface HomeErrorState {
  upcomingEvents: boolean;
  attentionRequired: boolean;
  pastEvents: boolean;
  aiInsights: boolean;
}

interface HomeErrorContextType {
  errors: HomeErrorState;
  setComponentError: (component: keyof HomeErrorState, hasError: boolean) => void;
  clearAllErrors: () => void;
  hasAnyError: boolean;
  showCachedDataWarning: boolean;
  setShowCachedDataWarning: (show: boolean) => void;
}

const HomeErrorContext = createContext<HomeErrorContextType | null>(null);

export const useHomeError = () => {
  const context = useContext(HomeErrorContext);
  if (!context) {
    throw new Error('useHomeError must be used within HomeErrorProvider');
  }
  return context;
};

interface HomeErrorProviderProps {
  children: ReactNode;
}

export const HomeErrorProvider: React.FC<HomeErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<HomeErrorState>({
    upcomingEvents: false,
    attentionRequired: false,
    pastEvents: false,
    aiInsights: false,
  });
  
  const [showCachedDataWarning, setShowCachedDataWarning] = useState(true);

  const setComponentError = useCallback((component: keyof HomeErrorState, hasError: boolean) => {
    setErrors(prev => ({
      ...prev,
      [component]: hasError
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      upcomingEvents: false,
      attentionRequired: false,
      pastEvents: false,
      aiInsights: false,
    });
  }, []);

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <HomeErrorContext.Provider 
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
    </HomeErrorContext.Provider>
  );
};