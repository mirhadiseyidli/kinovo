import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CityErrorState {
  events: boolean;
  cityInfo: boolean;
}

interface CityErrorContextType {
  errors: CityErrorState;
  setComponentError: (component: keyof CityErrorState, hasError: boolean) => void;
  clearAllErrors: () => void;
  hasAnyError: boolean;
  showCachedDataWarning: boolean;
  setShowCachedDataWarning: (show: boolean) => void;
}

const CityErrorContext = createContext<CityErrorContextType | null>(null);

export const useCityError = () => {
  const context = useContext(CityErrorContext);
  if (!context) {
    throw new Error('useCityError must be used within CityErrorProvider');
  }
  return context;
};

interface CityErrorProviderProps {
  children: ReactNode;
}

export const CityErrorProvider: React.FC<CityErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<CityErrorState>({
    events: false,
    cityInfo: false,
  });
  
  const [showCachedDataWarning, setShowCachedDataWarning] = useState(true);

  const setComponentError = useCallback((component: keyof CityErrorState, hasError: boolean) => {
    setErrors(prev => ({
      ...prev,
      [component]: hasError
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      events: false,
      cityInfo: false,
    });
  }, []);

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <CityErrorContext.Provider 
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
    </CityErrorContext.Provider>
  );
};