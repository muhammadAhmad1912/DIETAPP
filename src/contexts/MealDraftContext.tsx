import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Food } from '@/types/models';
import { scaleByGrams } from '@/utils/nutrition';

export type MealDraftItem = {
  key: string;
  food: Food;
  /** Amount consumed in grams (defaults to one serving). */
  grams: number;
};

interface MealDraftContextValue {
  items: MealDraftItem[];
  addFood: (food: Food, grams?: number) => void;
  /** Replace draft with these entries (used when loading a planned meal). */
  loadEntries: (entries: Array<{ food: Food; grams: number }>) => void;
  setItemGrams: (key: string, grams: number) => void;
  adjustServings: (key: string, delta: number) => void;
  adjustServingsByFoodId: (foodId: string, delta: number) => void;
  getServingsForFood: (foodId: string) => number;
  removeItem: (key: string) => void;
  clear: () => void;
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

const MealDraftContext = createContext<MealDraftContextValue | null>(null);

let draftKey = 0;
function nextKey() {
  draftKey += 1;
  return `draft-${draftKey}`;
}

export function MealDraftProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MealDraftItem[]>([]);

  const addFood = useCallback((food: Food, grams?: number) => {
    const amount = grams && grams > 0 ? grams : food.serving_size_g;
    setItems((prev) => {
      const existing = prev.find((item) => item.food.id === food.id);
      if (existing) {
        return prev.map((item) =>
          item.food.id === food.id
            ? { ...item, grams: item.grams + amount }
            : item,
        );
      }
      return [
        ...prev,
        {
          key: nextKey(),
          food,
          grams: amount,
        },
      ];
    });
  }, []);

  const loadEntries = useCallback(
    (entries: Array<{ food: Food; grams: number }>) => {
      setItems(
        entries.map(({ food, grams }) => ({
          key: nextKey(),
          food,
          grams: grams > 0 ? grams : food.serving_size_g,
        })),
      );
    },
    [],
  );
  const setItemGrams = useCallback((key: string, grams: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, grams: Math.max(0, grams) } : item,
      ),
    );
  }, []);

  const adjustServings = useCallback((key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const step = item.food.serving_size_g > 0 ? item.food.serving_size_g : 100;
          const next = item.grams + delta * step;
          return { ...item, grams: next };
        })
        .filter((item) => item.grams > 0),
    );
  }, []);

  const adjustServingsByFoodId = useCallback((foodId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.food.id !== foodId) return item;
          const step = item.food.serving_size_g > 0 ? item.food.serving_size_g : 100;
          const next = item.grams + delta * step;
          return { ...item, grams: next };
        })
        .filter((item) => item.grams > 0),
    );
  }, []);

  const getServingsForFood = useCallback(
    (foodId: string) => {
      const item = items.find((i) => i.food.id === foodId);
      if (!item) return 0;
      const step = item.food.serving_size_g > 0 ? item.food.serving_size_g : 100;
      return Math.round((item.grams / step) * 10) / 10;
    },
    [items],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const n = scaleByGrams(item.food, item.grams);
          acc.calories += n.calories;
          acc.protein_g += n.protein_g;
          acc.carbs_g += n.carbs_g;
          acc.fat_g += n.fat_g;
          return acc;
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addFood,
      loadEntries,
      setItemGrams,
      adjustServings,
      adjustServingsByFoodId,
      getServingsForFood,
      removeItem,
      clear,
      totals,
    }),
    [
      items,
      addFood,
      loadEntries,
      setItemGrams,
      adjustServings,
      adjustServingsByFoodId,
      getServingsForFood,
      removeItem,
      clear,
      totals,
    ],
  );

  return (
    <MealDraftContext.Provider value={value}>
      {children}
    </MealDraftContext.Provider>
  );
}

export function useMealDraft() {
  const ctx = useContext(MealDraftContext);
  if (!ctx) throw new Error('useMealDraft must be used within MealDraftProvider');
  return ctx;
}
