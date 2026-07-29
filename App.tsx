import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { MealDraftProvider } from '@/contexts/MealDraftContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { syncScheduledNotifications } from '@/services/notifications/notifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppShell() {
  const { isDark } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    void syncScheduledNotifications();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <InventoryProvider>
              <AppDataProvider>
                <MealDraftProvider>
                  <AppShell />
                </MealDraftProvider>
              </AppDataProvider>
            </InventoryProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
