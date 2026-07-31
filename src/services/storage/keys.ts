export const StorageKeys = {
  PROFILE: '@diet/profile',
  GOALS: '@diet/goals',
  FOODS: '@diet/foods',
  MEALS: '@diet/meals',
  MEAL_ITEMS: '@diet/meal_items',
  WEIGHT_LOGS: '@diet/weight_logs',
  WATER_LOGS: '@diet/water_logs',
  FAVORITES: '@diet/favorites',
  RECENT_FOODS: '@diet/recent_foods',
  THEME: '@diet/theme',
  NOTIFICATIONS: '@diet/notifications',
  ONBOARDING_DRAFT: '@diet/onboarding_draft',
  LOCAL_USER_ID: '@diet/local_user_id',
  INVENTORY: '@inventory/items',
  MEAL_PLANS: '@diet/meal_plans',
  GROCERY_LIST: '@diet/grocery_list',
  KEEP_SIGNED_IN: '@auth/keep_signed_in',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
