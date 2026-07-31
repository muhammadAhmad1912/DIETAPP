import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from '@/types/navigation';

const prefix = Linking.createURL('/');

/**
 * Deep links for future Quick Add shortcuts / widgets.
 * Examples:
 *   diettracker://quick-add
 *   diettracker://quick-add?barcode=3017620422003
 *   diettracker://add-meal?mealType=breakfast
 *   diettracker://food-search
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'diettracker://'],
  config: {
    screens: {
      QuickAdd: {
        path: 'quick-add',
        parse: {
          foodId: (value: string) => value,
          barcode: (value: string) => value,
        },
      },
      AddMeal: {
        path: 'add-meal',
        parse: {
          mealType: (value: string) => value,
          date: (value: string) => value,
        },
      },
      FoodSearch: 'food-search',
      BarcodeScanner: 'scan',
      MainTabs: {
        path: '',
        screens: {
          Dashboard: 'dashboard',
          History: 'history',
          Progress: 'progress',
          Weight: 'weight',
          Inventory: 'inventory',
          More: 'more',
        },
      },
      Auth: 'auth',
      Onboarding: 'onboarding',
      Settings: 'settings',
      Favorites: 'favorites',
      CanIEatThis: 'can-i-eat',
      MealPlanner: 'meal-planner',
      GroceryList: 'grocery-list',
      AddInventoryItem: 'inventory/add',
    },
  },
};
