import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CategoryErrorState {
  events: boolean;
  categoryInfo: boolean;
}

interface CategoryErrorContextType {
  errors: CategoryErrorState;
  setComponentError: (component: keyof CategoryErrorState, hasError: boolean) => void;
  clearAllErrors: () => void;
  hasAnyError: boolean;
  showCachedDataWarning: boolean;
  setShowCachedDataWarning: (show: boolean) => void;
}

const CategoryErrorContext = createContext<CategoryErrorContextType | null>(null);

export const useCategoryError = () => {
  const context = useContext(CategoryErrorContext);
  if (!context) {
    throw new Error('useCategoryError must be used within CategoryErrorProvider');
  }
  return context;
};

interface CategoryErrorProviderProps {
  children: ReactNode;
}

export const CategoryErrorProvider: React.FC<CategoryErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<CategoryErrorState>({
    events: false,
    categoryInfo: false,
  });
  
  const [showCachedDataWarning, setShowCachedDataWarning] = useState(true);

  const setComponentError = useCallback((component: keyof CategoryErrorState, hasError: boolean) => {
    setErrors(prev => ({
      ...prev,
      [component]: hasError
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      events: false,
      categoryInfo: false,
    });
  }, []);

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <CategoryErrorContext.Provider 
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
    </CategoryErrorContext.Provider>
  );
};