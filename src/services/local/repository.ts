import { SEED_FOODS, DEFAULT_WATER_GOAL_ML } from '@/constants/config';
import { cacheGet, cacheSet } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';
import type {
  Food,
  FoodSuggestion,
  Goals,
  Meal,
  MealItem,
  MealWithItems,
  Profile,
  WaterLog,
  WeightLog,
  DailyTotals,
  MealType,
} from '@/types/models';
import { createId, toDateKey } from '@/utils/dates';
import { buildFoodSuggestions } from '@/utils/foodSuggestions';

async function ensureUserId(): Promise<string> {
  const existing = await cacheGet<string>(StorageKeys.LOCAL_USER_ID);
  if (existing) return existing;
  const id = createId();
  await cacheSet(StorageKeys.LOCAL_USER_ID, id);
  return id;
}

async function ensureSeedFoods(): Promise<Food[]> {
  const existing = await cacheGet<Food[]>(StorageKeys.FOODS);
  if (existing && existing.length > 0) return existing;

  const now = new Date().toISOString();
  const foods: Food[] = SEED_FOODS.map((f) => ({
    id: createId(),
    ...f,
    is_favorite: false,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  }));
  await cacheSet(StorageKeys.FOODS, foods);
  return foods;
}

export const localRepo = {
  async getProfile(): Promise<Profile | null> {
    return cacheGet<Profile>(StorageKeys.PROFILE);
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    await cacheSet(StorageKeys.PROFILE, profile);
    return profile;
  },

  async completeOnboarding(input: {
    age: number;
    height_cm: number;
    weight_kg: number;
    sex: Profile['sex'];
    activity_level: Profile['activity_level'];
    goal: Profile['goal'];
    calorie_goal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_goal_ml?: number;
  }): Promise<{ profile: Profile; goals: Goals }> {
    const userId = await ensureUserId();
    const now = new Date().toISOString();

    const profile: Profile = {
      id: userId,
      age: input.age,
      height_cm: input.height_cm,
      weight_kg: input.weight_kg,
      sex: input.sex,
      activity_level: input.activity_level,
      goal: input.goal,
      onboarding_completed: true,
      theme_preference: 'system',
      water_goal_ml: input.water_goal_ml ?? DEFAULT_WATER_GOAL_ML,
      created_at: now,
      updated_at: now,
    };

    const goals: Goals = {
      id: createId(),
      profile_id: userId,
      calorie_goal: input.calorie_goal,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      effective_from: toDateKey(),
      created_at: now,
      updated_at: now,
    };

    const weightLog: WeightLog = {
      id: createId(),
      profile_id: userId,
      weight_kg: input.weight_kg,
      logged_at: now,
      notes: 'Starting weight',
      created_at: now,
    };

    await this.saveProfile(profile);
    await cacheSet(StorageKeys.GOALS, goals);
    await ensureSeedFoods();

    const weights = (await cacheGet<WeightLog[]>(StorageKeys.WEIGHT_LOGS)) ?? [];
    weights.push(weightLog);
    await cacheSet(StorageKeys.WEIGHT_LOGS, weights);

    return { profile, goals };
  },

  async getGoals(): Promise<Goals | null> {
    return cacheGet<Goals>(StorageKeys.GOALS);
  },

  async saveGoals(goals: Goals): Promise<Goals> {
    await cacheSet(StorageKeys.GOALS, goals);
    return goals;
  },

  async getFoods(): Promise<Food[]> {
    return ensureSeedFoods();
  },

  async searchFoods(query: string): Promise<Food[]> {
    const foods = await this.getFoods();
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false) ||
        (f.barcode?.includes(q) ?? false),
    );
  },

  async upsertFood(
    partial: Omit<Food, 'id' | 'created_at' | 'updated_at' | 'is_favorite' | 'last_used_at'> & {
      id?: string;
      is_favorite?: boolean;
      last_used_at?: string | null;
    },
  ): Promise<Food> {
    const foods = await this.getFoods();
    const now = new Date().toISOString();

    if (partial.id) {
      const idx = foods.findIndex((f) => f.id === partial.id);
      if (idx >= 0) {
        foods[idx] = {
          ...foods[idx],
          ...partial,
          updated_at: now,
        };
        await cacheSet(StorageKeys.FOODS, foods);
        return foods[idx];
      }
    }

    if (partial.barcode) {
      const byBarcode = foods.find((f) => f.barcode === partial.barcode);
      if (byBarcode) {
        const updated = { ...byBarcode, ...partial, updated_at: now };
        const idx = foods.findIndex((f) => f.id === byBarcode.id);
        foods[idx] = updated;
        await cacheSet(StorageKeys.FOODS, foods);
        return updated;
      }
    }

    const food: Food = {
      id: createId(),
      name: partial.name,
      brand: partial.brand,
      barcode: partial.barcode,
      serving_size_g: partial.serving_size_g,
      calories: partial.calories,
      protein_g: partial.protein_g,
      carbs_g: partial.carbs_g,
      fat_g: partial.fat_g,
      fiber_g: partial.fiber_g,
      source: partial.source,
      is_favorite: partial.is_favorite ?? false,
      last_used_at: partial.last_used_at ?? null,
      created_at: now,
      updated_at: now,
    };
    foods.unshift(food);
    await cacheSet(StorageKeys.FOODS, foods);
    return food;
  },

  async toggleFavorite(foodId: string): Promise<Food | null> {
    const foods = await this.getFoods();
    const idx = foods.findIndex((f) => f.id === foodId);
    if (idx < 0) return null;
    foods[idx] = {
      ...foods[idx],
      is_favorite: !foods[idx].is_favorite,
      updated_at: new Date().toISOString(),
    };
    await cacheSet(StorageKeys.FOODS, foods);

    const favIds = (await cacheGet<string[]>(StorageKeys.FAVORITES)) ?? [];
    if (foods[idx].is_favorite) {
      if (!favIds.includes(foodId)) favIds.push(foodId);
    } else {
      const i = favIds.indexOf(foodId);
      if (i >= 0) favIds.splice(i, 1);
    }
    await cacheSet(StorageKeys.FAVORITES, favIds);
    return foods[idx];
  },

  async getFavorites(): Promise<Food[]> {
    const foods = await this.getFoods();
    return foods.filter((f) => f.is_favorite);
  },

  async getRecentFoods(limit = 20): Promise<Food[]> {
    const foods = await this.getFoods();
    return foods
      .filter((f) => f.last_used_at)
      .sort(
        (a, b) =>
          (b.last_used_at ? Date.parse(b.last_used_at) : 0) -
          (a.last_used_at ? Date.parse(a.last_used_at) : 0),
      )
      .slice(0, limit);
  },

  /** Frequent foods for a meal type, with typical serving sizes from history. */
  async getSuggestedFoods(
    mealType: MealType,
    limit = 8,
  ): Promise<FoodSuggestion[]> {
    const [meals, items, foods] = await Promise.all([
      this.getMeals(),
      this.getMealItems(),
      this.getFoods(),
    ]);
    return buildFoodSuggestions(mealType, meals, items, foods, limit);
  },

  async markFoodUsed(foodId: string): Promise<void> {
    const foods = await this.getFoods();
    const idx = foods.findIndex((f) => f.id === foodId);
    if (idx < 0) return;
    foods[idx] = {
      ...foods[idx],
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await cacheSet(StorageKeys.FOODS, foods);
  },

  async getMeals(): Promise<Meal[]> {
    return (await cacheGet<Meal[]>(StorageKeys.MEALS)) ?? [];
  },

  async getMealItems(): Promise<MealItem[]> {
    return (await cacheGet<MealItem[]>(StorageKeys.MEAL_ITEMS)) ?? [];
  },

  async getMealWithItems(mealId: string): Promise<MealWithItems | null> {
    const meals = await this.getMeals();
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return null;
    const items = (await this.getMealItems()).filter((i) => i.meal_id === mealId);
    return { ...meal, items };
  },

  async createMeal(input: {
    name: string;
    meal_type: MealType;
    logged_at?: string;
    notes?: string | null;
    items: Array<{
      food_id: string | null;
      food_name: string;
      servings: number;
      serving_size_g: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>;
  }): Promise<MealWithItems> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Profile required');

    const now = new Date().toISOString();
    const meal: Meal = {
      id: createId(),
      profile_id: profile.id,
      name: input.name,
      meal_type: input.meal_type,
      logged_at: input.logged_at ?? now,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    const items: MealItem[] = input.items.map((item) => ({
      id: createId(),
      meal_id: meal.id,
      ...item,
      created_at: now,
    }));

    const meals = await this.getMeals();
    meals.unshift(meal);
    await cacheSet(StorageKeys.MEALS, meals);

    const allItems = await this.getMealItems();
    allItems.push(...items);
    await cacheSet(StorageKeys.MEAL_ITEMS, allItems);

    for (const item of items) {
      if (item.food_id) await this.markFoodUsed(item.food_id);
    }

    return { ...meal, items };
  },

  async deleteMeal(mealId: string): Promise<void> {
    const meals = (await this.getMeals()).filter((m) => m.id !== mealId);
    const items = (await this.getMealItems()).filter((i) => i.meal_id !== mealId);
    await cacheSet(StorageKeys.MEALS, meals);
    await cacheSet(StorageKeys.MEAL_ITEMS, items);
  },

  async getDailyTotals(dateKey: string): Promise<DailyTotals> {
    const meals = await this.getMeals();
    const items = await this.getMealItems();
    const water = await this.getWaterLogs();

    const dayMeals = meals.filter((m) => toDateKey(m.logged_at) === dateKey);
    const withItems: MealWithItems[] = dayMeals.map((m) => ({
      ...m,
      items: items.filter((i) => i.meal_id === m.id),
    }));

    const totals = withItems.reduce(
      (acc, meal) => {
        for (const item of meal.items) {
          acc.calories += item.calories;
          acc.protein_g += item.protein_g;
          acc.carbs_g += item.carbs_g;
          acc.fat_g += item.fat_g;
        }
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );

    const water_ml = water
      .filter((w) => toDateKey(w.logged_at) === dateKey)
      .reduce((sum, w) => sum + w.amount_ml, 0);

    return {
      date: dateKey,
      ...totals,
      water_ml,
      meals: withItems.sort(
        (a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at),
      ),
    };
  },

  async getHistoryDates(limit = 30): Promise<string[]> {
    const meals = await this.getMeals();
    const set = new Set(meals.map((m) => toDateKey(m.logged_at)));
    set.add(toDateKey());
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1)).slice(0, limit);
  },

  async getWeightLogs(): Promise<WeightLog[]> {
    const logs = (await cacheGet<WeightLog[]>(StorageKeys.WEIGHT_LOGS)) ?? [];
    return logs.sort(
      (a, b) => Date.parse(b.logged_at) - Date.parse(a.logged_at),
    );
  },

  async addWeightLog(weight_kg: number, notes?: string): Promise<WeightLog> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Profile required');
    const now = new Date().toISOString();
    const log: WeightLog = {
      id: createId(),
      profile_id: profile.id,
      weight_kg,
      logged_at: now,
      notes: notes ?? null,
      created_at: now,
    };
    const logs = await this.getWeightLogs();
    logs.unshift(log);
    await cacheSet(StorageKeys.WEIGHT_LOGS, logs);

    await this.saveProfile({
      ...profile,
      weight_kg,
      updated_at: now,
    });

    return log;
  },

  async deleteWeightLog(id: string): Promise<void> {
    const logs = (await this.getWeightLogs()).filter((l) => l.id !== id);
    await cacheSet(StorageKeys.WEIGHT_LOGS, logs);
  },

  async getWaterLogs(): Promise<WaterLog[]> {
    return (await cacheGet<WaterLog[]>(StorageKeys.WATER_LOGS)) ?? [];
  },

  async addWater(amount_ml: number, date = new Date()): Promise<WaterLog> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Profile required');
    const log: WaterLog = {
      id: createId(),
      profile_id: profile.id,
      amount_ml,
      logged_at: date.toISOString(),
      created_at: new Date().toISOString(),
    };
    const logs = await this.getWaterLogs();
    logs.push(log);
    await cacheSet(StorageKeys.WATER_LOGS, logs);
    return log;
  },

  async getWaterForDate(dateKey: string): Promise<number> {
    const logs = await this.getWaterLogs();
    return logs
      .filter((l) => toDateKey(l.logged_at) === dateKey)
      .reduce((s, l) => s + l.amount_ml, 0);
  },

  async getWeeklyCalorieSeries(endDate = new Date()): Promise<
    Array<{ date: string; calories: number }>
  > {
    const series: Array<{ date: string; calories: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const totals = await this.getDailyTotals(key);
      series.push({ date: key, calories: totals.calories });
    }
    return series;
  },

  async findFoodByBarcode(barcode: string): Promise<Food | null> {
    const foods = await this.getFoods();
    return foods.find((f) => f.barcode === barcode) ?? null;
  },
};
