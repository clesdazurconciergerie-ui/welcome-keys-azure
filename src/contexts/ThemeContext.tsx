import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Theme, DEFAULT_THEME } from '@/types/theme';
import { validateTheme, applyThemeToRoot } from '@/lib/theme-utils';

interface ThemeContextValue {
  theme: Theme;
  originalTheme: Theme; // For cancel functionality
  updateTheme: (updates: Partial<Theme>) => void;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
  applyChanges: () => void;
  cancelChanges: () => void;
  hasUnsavedChanges: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export function ThemeProvider({ children, initialTheme, onThemeChange }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme || DEFAULT_THEME);
  const [originalTheme, setOriginalTheme] = useState<Theme>(initialTheme || DEFAULT_THEME);

  // Apply theme to root on mount and when theme changes
  useEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  const updateTheme = useCallback((updates: Partial<Theme>) => {
    setThemeState(prev => {
      try {
        return validateTheme({ ...prev, ...updates });
      } catch (error) {
        console.error('Invalid theme update:', error);
        return prev;
      }
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      const validated = validateTheme(newTheme);
      setThemeState(validated);
    } catch (error) {
      console.error('Invalid theme:', error);
    }
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(DEFAULT_THEME);
    setOriginalTheme(DEFAULT_THEME);
  }, []);

  const applyChanges = useCallback(() => {
    setOriginalTheme(theme);
    onThemeChange?.(theme);
  }, [theme, onThemeChange]);

  const cancelChanges = useCallback(() => {
    setThemeState(originalTheme);
  }, [originalTheme]);

  const hasUnsavedChanges = JSON.stringify(theme) !== JSON.stringify(originalTheme);

  const value: ThemeContextValue = {
    theme,
    originalTheme,
    updateTheme,
    setTheme,
    resetTheme,
    applyChanges,
    cancelChanges,
    hasUnsavedChanges
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
