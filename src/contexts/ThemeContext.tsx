import React, { createContext, useContext, useEffect, ReactNode } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme: Theme = 'dark';

  useEffect(() => {
    // Apply dark theme to document body
    document.body.setAttribute('data-theme', theme);
    
    // Set dark mode CSS custom properties
    document.documentElement.style.setProperty('--bg-primary', '#302e32');
    document.documentElement.style.setProperty('--bg-secondary', '#2c2c2c');
    document.documentElement.style.setProperty('--text-primary', '#ffffff');
    document.documentElement.style.setProperty('--text-secondary', '#cccccc');
    document.documentElement.style.setProperty('--border-color', '#404040');
    document.documentElement.style.setProperty('--card-bg', '#2c2c2c');
    document.documentElement.style.setProperty('--shadow', '0 4px 20px rgba(0, 0, 0, 0.3)');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 