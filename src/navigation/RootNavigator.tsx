import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { linking } from './linking';
import { AuthScreen } from '@/screens/auth/AuthScreen';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { AddMealScreen } from '@/screens/meals/AddMealScreen';
import { MealDetailScreen } from '@/screens/meals/MealDetailScreen';
import { FoodSearchScreen } from '@/screens/foods/FoodSearchScreen';
import { BarcodeScannerScreen } from '@/screens/foods/BarcodeScannerScreen';
import { DayDetailScreen } from '@/screens/history/DayDetailScreen';
import { QuickAddScreen } from '@/screens/settings/QuickAddScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { AddInventoryItemScreen } from '@/screens/inventory/AddInventoryItemScreen';
import { InventoryItemDetailScreen } from '@/screens/inventory/InventoryItemDetailScreen';
import { FavoritesScreen } from '@/screens/foods/FavoritesScreen';
import { CanIEatThisScreen } from '@/screens/foods/CanIEatThisScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { ready: authReady, user } = useAuth();
  const { ready: dataReady, profile } = useAppData();
  const { colors, isDark } = useTheme();

  if (!authReady || !dataReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  const onboarded = Boolean(profile?.onboarding_completed);

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : !onboarded ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddInventoryItem"
              component={AddInventoryItemScreen}
              options={{ title: 'Add item' }}
            />
            <Stack.Screen
              name="InventoryItemDetail"
              component={InventoryItemDetailScreen}
              options={{ title: 'Item' }}
            />
            <Stack.Screen
              name="AddMeal"
              component={AddMealScreen}
              options={{ title: 'Add meal' }}
            />
            <Stack.Screen
              name="FoodSearch"
              component={FoodSearchScreen}
              options={{ title: 'Search foods' }}
            />
            <Stack.Screen
              name="BarcodeScanner"
              component={BarcodeScannerScreen}
              options={{ title: 'Scan barcode', headerShown: false }}
            />
            <Stack.Screen
              name="MealDetail"
              component={MealDetailScreen}
              options={{ title: 'Meal' }}
            />
            <Stack.Screen
              name="DayDetail"
              component={DayDetailScreen}
              options={{ title: 'Day' }}
            />
            <Stack.Screen
              name="QuickAdd"
              component={QuickAddScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Favorites"
              component={FavoritesScreen}
              options={{ title: 'Favorites' }}
            />
            <Stack.Screen
              name="CanIEatThis"
              component={CanIEatThisScreen}
              options={{ title: 'Can I eat this?' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
