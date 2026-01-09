import { createContext, useContext, ReactNode } from 'react';

interface NavigationContextType {
  navigateToDashboard: () => void;
  currentView: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ 
  children, 
  navigateToDashboard, 
  currentView 
}: { 
  children: ReactNode;
  navigateToDashboard: () => void;
  currentView: string;
}) {
  return (
    <NavigationContext.Provider value={{ navigateToDashboard, currentView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

