import { cacheGet, cacheSet } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';
import type { DayMealPlan, Food, MealType, PlannedFoodItem } from '@/types/models';
import { createId } from '@/utils/dates';
import { scaleByGrams } from '@/utils/nutrition';

const EMPTY_SLOTS = (): DayMealPlan['slots'] => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
});

export function emptyDayPlan(date: string): DayMealPlan {
  return {
    date,
    slots: EMPTY_SLOTS(),
    updated_at: new Date().toISOString(),
  };
}

async function readAll(): Promise<Record<string, DayMealPlan>> {
  return (await cacheGet<Record<string, DayMealPlan>>(StorageKeys.MEAL_PLANS)) ?? {};
}

async function writeAll(map: Record<string, DayMealPlan>): Promise<void> {
  await cacheSet(StorageKeys.MEAL_PLANS, map);
}

export async function getDayPlan(date: string): Promise<DayMealPlan> {
  const all = await readAll();
  return all[date] ?? emptyDayPlan(date);
}

/** Plans for an inclusive date-key range (missing days omitted). */
export async function getPlansInRange(
  startDate: string,
  endDate: string,
): Promise<DayMealPlan[]> {
  const all = await readAll();
  return Object.values(all)
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function saveDayPlan(plan: DayMealPlan): Promise<DayMealPlan> {
  const all = await readAll();
  const next = {
    ...plan,
    updated_at: new Date().toISOString(),
  };
  all[plan.date] = next;
  await writeAll(all);
  return next;
}

export async function addFoodToPlan(
  date: string,
  mealType: MealType,
  food: Food,
  grams?: number,
): Promise<DayMealPlan> {
  const plan = await getDayPlan(date);
  const amount = grams && grams > 0 ? grams : food.serving_size_g;
  const n = scaleByGrams(food, amount);
  const item: PlannedFoodItem = {
    id: createId(),
    food_id: food.id.startsWith('inv-') ? null : food.id,
    food_name: food.name,
    grams: n.serving_size_g,
    calories: n.calories,
    protein_g: n.protein_g,
    carbs_g: n.carbs_g,
    fat_g: n.fat_g,
    serving_size_g: food.serving_size_g,
  };
  plan.slots[mealType] = [...plan.slots[mealType], item];
  return saveDayPlan(plan);
}

export async function removeFoodFromPlan(
  date: string,
  mealType: MealType,
  itemId: string,
): Promise<DayMealPlan> {
  const plan = await getDayPlan(date);
  plan.slots[mealType] = plan.slots[mealType].filter((i) => i.id !== itemId);
  return saveDayPlan(plan);
}

export async function clearDayPlan(date: string): Promise<DayMealPlan> {
  return saveDayPlan(emptyDayPlan(date));
}

export function planDayTotals(plan: DayMealPlan) {
  const all = [
    ...plan.slots.breakfast,
    ...plan.slots.lunch,
    ...plan.slots.dinner,
    ...plan.slots.snack,
  ];
  return all.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein_g += item.protein_g;
      acc.carbs_g += item.carbs_g;
      acc.fat_g += item.fat_g;
      acc.count += 1;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 },
  );
}
