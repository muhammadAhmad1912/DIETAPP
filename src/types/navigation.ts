export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  AddMeal: { mealType?: string; date?: string } | undefined;
  FoodSearch:
    | {
        mealId?: string;
        mealType?: string;
        selectForMeal?: boolean;
        /** Browse/search to star foods without adding to a meal. */
        mode?: 'meal' | 'favorites';
      }
    | undefined;
  BarcodeScanner:
    | { mealId?: string; mode?: 'inventory' | 'meal' | 'canIEat' }
    | undefined;
  MealDetail: { mealId: string };
  DayDetail: { date: string };
  QuickAdd: { foodId?: string; barcode?: string } | undefined;
  Settings: undefined;
  Favorites: undefined;
  CanIEatThis: { foodId?: string; barcode?: string } | undefined;
  MealPlanner: undefined;
  GroceryList: { regenerate?: boolean } | undefined;
  AddInventoryItem: { barcode?: string } | undefined;
  InventoryItemDetail: { itemId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Progress: undefined;
  Weight: undefined;
  Inventory: undefined;
  More: undefined;
};
