import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  DailyTotals,
  Food,
  Goals,
  MealType,
  MealWithItems,
  Profile,
  WeightLog,
} from '@/types/models';
import { localRepo } from '@/services/local/repository';
import { toDateKey } from '@/utils/dates';
import { WATER_INCREMENT_ML } from '@/constants/config';

interface AppDataContextValue {
  ready: boolean;
  profile: Profile | null;
  goals: Goals | null;
  today: DailyTotals | null;
  favorites: Food[];
  recentFoods: Food[];
  weightLogs: WeightLog[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  refresh: () => Promise<void>;
  completeOnboarding: Parameters<typeof localRepo.completeOnboarding>[0] extends infer T
    ? (input: T) => Promise<void>
    : never;
  addMeal: (input: {
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
  }) => Promise<MealWithItems>;
  deleteMeal: (mealId: string) => Promise<void>;
  addWater: (amount?: number) => Promise<void>;
  addWeight: (kg: number, notes?: string) => Promise<void>;
  toggleFavorite: (foodId: string) => Promise<void>;
  /** Favorite/unfavorite any food (upserts inventory-sourced foods into the catalog first). */
  toggleFavoriteFood: (food: Food) => Promise<void>;
  searchFoods: (query: string) => Promise<Food[]>;
  upsertFood: typeof localRepo.upsertFood;
  updateGoals: (goals: Partial<Goals>) => Promise<void>;
  updateWaterGoal: (ml: number) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [today, setToday] = useState<DailyTotals | null>(null);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(toDateKey());

  const refresh = useCallback(async () => {
    const [p, g, totals, favs, recent, weights] = await Promise.all([
      localRepo.getProfile(),
      localRepo.getGoals(),
      localRepo.getDailyTotals(selectedDate),
      localRepo.getFavorites(),
      localRepo.getRecentFoods(),
      localRepo.getWeightLogs(),
    ]);
    setProfile(p);
    setGoals(g);
    setToday(totals);
    setFavorites(favs);
    setRecentFoods(recent);
    setWeightLogs(weights);
    setReady(true);
  }, [selectedDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completeOnboarding = useCallback(
    async (input: Parameters<typeof localRepo.completeOnboarding>[0]) => {
      await localRepo.completeOnboarding(input);
      await refresh();
    },
    [refresh],
  );

  const addMeal = useCallback(
    async (input: Parameters<AppDataContextValue['addMeal']>[0]) => {
      const meal = await localRepo.createMeal(input);
      await refresh();
      return meal;
    },
    [refresh],
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      await localRepo.deleteMeal(mealId);
      await refresh();
    },
    [refresh],
  );

  const addWater = useCallback(
    async (amount = WATER_INCREMENT_ML) => {
      await localRepo.addWater(amount);
      await refresh();
    },
    [refresh],
  );

  const addWeight = useCallback(
    async (kg: number, notes?: string) => {
      await localRepo.addWeightLog(kg, notes);
      await refresh();
    },
    [refresh],
  );

  const toggleFavorite = useCallback(
    async (foodId: string) => {
      await localRepo.toggleFavorite(foodId);
      await refresh();
    },
    [refresh],
  );

  const toggleFavoriteFood = useCallback(
    async (food: Food) => {
      let foodId = food.id;
      if (foodId.startsWith('inv-')) {
        const catalog = await localRepo.getFoods();
        const existing =
          (food.barcode
            ? catalog.find((f) => f.barcode === food.barcode)
            : undefined) ??
          catalog.find(
            (f) =>
              f.name.toLowerCase() === food.name.toLowerCase() &&
              (f.brand ?? '') === (food.brand ?? ''),
          );
        if (existing) {
          foodId = existing.id;
        } else {
          const created = await localRepo.upsertFood({
            name: food.name,
            brand: food.brand,
            barcode: food.barcode,
            serving_size_g: food.serving_size_g,
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            fiber_g: food.fiber_g,
            source: food.source,
            is_favorite: false,
          });
          foodId = created.id;
        }
      }
      await localRepo.toggleFavorite(foodId);
      await refresh();
    },
    [refresh],
  );

  const updateGoals = useCallback(
    async (partial: Partial<Goals>) => {
      const current = await localRepo.getGoals();
      if (!current) return;
      const next = {
        ...current,
        ...partial,
        updated_at: new Date().toISOString(),
      };
      await localRepo.saveGoals(next);
      await refresh();
    },
    [refresh],
  );

  const updateWaterGoal = useCallback(
    async (ml: number) => {
      const current = await localRepo.getProfile();
      if (!current) return;
      await localRepo.saveProfile({
        ...current,
        water_goal_ml: ml,
        updated_at: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      ready,
      profile,
      goals,
      today,
      favorites,
      recentFoods,
      weightLogs,
      selectedDate,
      setSelectedDate,
      refresh,
      completeOnboarding,
      addMeal,
      deleteMeal,
      addWater,
      addWeight,
      toggleFavorite,
      toggleFavoriteFood,
      searchFoods: localRepo.searchFoods.bind(localRepo),
      upsertFood: localRepo.upsertFood.bind(localRepo),
      updateGoals,
      updateWaterGoal,
    }),
    [
      ready,
      profile,
      goals,
      today,
      favorites,
      recentFoods,
      weightLogs,
      selectedDate,
      refresh,
      completeOnboarding,
      addMeal,
      deleteMeal,
      addWater,
      addWeight,
      toggleFavorite,
      toggleFavoriteFood,
      updateGoals,
      updateWaterGoal,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
