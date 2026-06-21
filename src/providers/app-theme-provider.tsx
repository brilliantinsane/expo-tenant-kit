import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { resolveTheme, type ThemeScheme } from '@/constants/theme';
import { useActiveSetupConfig } from '@/hooks/use-active-setup-config';
import { AppThemeContext } from '@/hooks/use-theme';
import { resolveActiveSetupAccent } from '@/utils/active-setup-accent';

const STORAGE_KEY = 'app-theme-scheme';

type AppThemeProviderProps = {
  children: ReactNode;
};

function isThemeScheme(value: unknown): value is ThemeScheme {
  return value === 'light' || value === 'dark';
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const activeSetupConfig = useActiveSetupConfig();
  const [storedScheme, setStoredScheme] = useState<ThemeScheme | null>(null);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (isMounted && isThemeScheme(value)) {
          setStoredScheme(value);
          Appearance.setColorScheme(value);
        }
      })
      .catch(() => {
        // If storage is unavailable, fall back to the current system scheme.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const scheme: ThemeScheme = storedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const activeSetupAccent = activeSetupConfig.theme.accent;
  const accent = useMemo(() => resolveActiveSetupAccent(activeSetupAccent), [activeSetupAccent]);
  const colors = useMemo(() => resolveTheme(scheme, accent), [accent, scheme]);

  const setScheme = useCallback((nextScheme: ThemeScheme) => {
    setStoredScheme(nextScheme);
    Appearance.setColorScheme(nextScheme);
    AsyncStorage.setItem(STORAGE_KEY, nextScheme).catch(() => {
      // Keep the in-memory preference even if persistence fails.
    });
  }, []);

  const navigationTheme = useMemo(() => {
    const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: scheme === 'dark',
      colors: {
        ...baseTheme.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.backgroundLight,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
      fonts: baseTheme.fonts,
    };
  }, [colors, scheme]);

  const value = useMemo(
    () => ({
      scheme,
      colors,
      setScheme,
    }),
    [colors, scheme, setScheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
}
