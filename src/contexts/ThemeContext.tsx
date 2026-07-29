import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import { Colors, type ThemeColors } from '@/theme/tokens';
import type { ThemePreference } from '@/types/models';
import { cacheGet, cacheSet } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';
import { localRepo } from '@/services/local/repository';

interface ThemeContextValue {
  preference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    (async () => {
      const cached = await cacheGet<ThemePreference>(StorageKeys.THEME);
      if (cached) {
        setPreferenceState(cached);
        return;
      }
      const profile = await localRepo.getProfile();
      if (profile?.theme_preference) {
        setPreferenceState(profile.theme_preference);
      }
    })();
  }, []);

  const isDark =
    preference === 'dark' || (preference === 'system' && system === 'dark');

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await cacheSet(StorageKeys.THEME, pref);
    const profile = await localRepo.getProfile();
    if (profile) {
      await localRepo.saveProfile({
        ...profile,
        theme_preference: pref,
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      preference,
      isDark,
      colors: isDark ? Colors.dark : Colors.light,
      setPreference,
    }),
    [preference, isDark, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
