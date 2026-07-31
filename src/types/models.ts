export type Sex = 'male' | 'female' | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type GoalType = 'lose' | 'maintain' | 'gain';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Profile {
  id: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: GoalType;
  onboarding_completed: boolean;
  theme_preference: ThemePreference;
  water_goal_ml: number;
  created_at: string;
  updated_at: string;
}

export interface Goals {
  id: string;
  profile_id: string;
  calorie_goal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  source: 'local' | 'open_food_facts' | 'custom' | 'ai';
  is_favorite: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Personalized pick derived from local meal history for a meal type. */
export interface FoodSuggestion {
  food: Food;
  /** Median grams eaten when this food was logged for the meal type. */
  typical_grams: number;
  times_eaten: number;
  last_eaten_at: string;
}

export interface Meal {
  id: string;
  profile_id: string;
  name: string;
  meal_type: MealType;
  logged_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name: string;
  servings: number;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface MealWithItems extends Meal {
  items: MealItem[];
}

export interface WeightLog {
  id: string;
  profile_id: string;
  weight_kg: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface WaterLog {
  id: string;
  profile_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

export interface DailyTotals {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  meals: MealWithItems[];
}

export interface OnboardingDraft {
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal: GoalType | null;
  calorie_goal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_goal_ml: number | null;
}

export interface NotificationSettings {
  enabled: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  weighInReminders: boolean;
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  waterIntervalHours: number;
}

/** One food entry inside a planned meal slot. */
export interface PlannedFoodItem {
  id: string;
  food_id: string | null;
  food_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size_g: number;
}

/** Saved meal plan for a single calendar day. */
export interface DayMealPlan {
  date: string;
  slots: Record<MealType, PlannedFoodItem[]>;
  updated_at: string;
}

/** Aggregated shopping item built from meal plans. */
export interface GroceryItem {
  /** Stable key: food_id or normalized name. */
  id: string;
  food_id: string | null;
  name: string;
  total_grams: number;
  serving_size_g: number;
  /** How many planned occurrences were merged. */
  source_count: number;
  /** Plan dates that contributed to this item. */
  dates: string[];
  checked: boolean;
  /** True when the user added this outside the meal planner. */
  manual?: boolean;
  /** Optional free-text note / quantity (for manual items). */
  note?: string | null;
}

export interface GroceryList {
  generated_at: string;
  range_start: string;
  range_end: string;
  items: GroceryItem[];
}

export interface MacroNutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
