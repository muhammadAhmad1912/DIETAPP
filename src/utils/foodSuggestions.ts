import type { Food, FoodSuggestion, Meal, MealItem, MealType } from '@/types/models';
import { round1 } from '@/utils/nutrition';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

type Aggregate = {
  foodId: string | null;
  foodName: string;
  grams: number[];
  count: number;
  lastEatenAt: string;
};

/**
 * Rank foods by how often they appear in meals of a given type,
 * and remember the typical grams eaten from history.
 */
export function buildFoodSuggestions(
  mealType: MealType,
  meals: Meal[],
  items: MealItem[],
  foods: Food[],
  limit = 8,
): FoodSuggestion[] {
  const mealsOfType = meals.filter((m) => m.meal_type === mealType);
  if (mealsOfType.length === 0 || limit <= 0) return [];

  const mealById = new Map(mealsOfType.map((m) => [m.id, m]));
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const foodByName = new Map(
    foods.map((f) => [f.name.trim().toLowerCase(), f]),
  );

  const aggregates = new Map<string, Aggregate>();

  for (const item of items) {
    const meal = mealById.get(item.meal_id);
    if (!meal) continue;

    const grams = item.serving_size_g > 0 ? item.serving_size_g : 0;
    if (grams <= 0) continue;

    const key = item.food_id
      ? `id:${item.food_id}`
      : `name:${item.food_name.trim().toLowerCase()}`;

    const existing = aggregates.get(key);
    if (existing) {
      existing.grams.push(grams);
      existing.count += 1;
      if (Date.parse(meal.logged_at) > Date.parse(existing.lastEatenAt)) {
        existing.lastEatenAt = meal.logged_at;
      }
    } else {
      aggregates.set(key, {
        foodId: item.food_id,
        foodName: item.food_name,
        grams: [grams],
        count: 1,
        lastEatenAt: meal.logged_at,
      });
    }
  }

  const ranked = Array.from(aggregates.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return Date.parse(b.lastEatenAt) - Date.parse(a.lastEatenAt);
  });

  const suggestions: FoodSuggestion[] = [];

  for (const agg of ranked) {
    if (suggestions.length >= limit) break;

    const food =
      (agg.foodId ? foodById.get(agg.foodId) : undefined) ??
      foodByName.get(agg.foodName.trim().toLowerCase());

    if (!food) continue;

    suggestions.push({
      food,
      typical_grams: round1(median(agg.grams)),
      times_eaten: agg.count,
      last_eaten_at: agg.lastEatenAt,
    });
  }

  return suggestions;
}

/** Filter suggestions whose name/brand match a search query. */
export function filterSuggestions(
  suggestions: FoodSuggestion[],
  query: string,
): FoodSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return suggestions;
  return suggestions.filter(
    (s) =>
      s.food.name.toLowerCase().includes(q) ||
      (s.food.brand?.toLowerCase().includes(q) ?? false) ||
      (s.food.barcode?.includes(q) ?? false),
  );
}

export function suggestionDetail(s: FoodSuggestion): string {
  return `Usual ${Math.round(s.typical_grams)}g · logged ${s.times_eaten}×`;
}
