import { addDays, format, parseISO } from 'date-fns';
import { getPlansInRange } from '@/services/mealPlan/mealPlan';
import { cacheGet, cacheSet } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';
import type { DayMealPlan, GroceryItem, GroceryList } from '@/types/models';
import { toDateKey } from '@/utils/dates';
import { round1 } from '@/utils/nutrition';

function itemKey(foodId: string | null, foodName: string): string {
  if (foodId) return `id:${foodId}`;
  return `name:${foodName.trim().toLowerCase()}`;
}

function emptyGroceryList(startDate = toDateKey(), days = 7): GroceryList {
  const endDate = format(addDays(parseISO(startDate), days - 1), 'yyyy-MM-dd');
  return {
    generated_at: new Date().toISOString(),
    range_start: startDate,
    range_end: endDate,
    items: [],
  };
}

function aggregateFromPlans(plans: DayMealPlan[]): Omit<GroceryItem, 'checked'>[] {
  type Acc = {
    id: string;
    food_id: string | null;
    name: string;
    total_grams: number;
    serving_size_g: number;
    source_count: number;
    dates: Set<string>;
  };

  const map = new Map<string, Acc>();

  for (const plan of plans) {
    const items = [
      ...plan.slots.breakfast,
      ...plan.slots.lunch,
      ...plan.slots.dinner,
      ...plan.slots.snack,
    ];
    for (const item of items) {
      const id = itemKey(item.food_id, item.food_name);
      const existing = map.get(id);
      if (existing) {
        existing.total_grams += item.grams;
        existing.source_count += 1;
        existing.dates.add(plan.date);
        if (item.serving_size_g > 0) {
          existing.serving_size_g = item.serving_size_g;
        }
      } else {
        map.set(id, {
          id,
          food_id: item.food_id,
          name: item.food_name,
          total_grams: item.grams,
          serving_size_g: item.serving_size_g > 0 ? item.serving_size_g : 100,
          source_count: 1,
          dates: new Set([plan.date]),
        });
      }
    }
  }

  return [...map.values()]
    .map((a) => ({
      id: a.id,
      food_id: a.food_id,
      name: a.name,
      total_grams: round1(a.total_grams),
      serving_size_g: a.serving_size_g,
      source_count: a.source_count,
      dates: [...a.dates].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGroceryList(): Promise<GroceryList | null> {
  return cacheGet<GroceryList>(StorageKeys.GROCERY_LIST);
}

export async function saveGroceryList(list: GroceryList): Promise<GroceryList> {
  await cacheSet(StorageKeys.GROCERY_LIST, list);
  return list;
}

/**
 * Build a grocery list from meal plans in [startDate, startDate+days).
 * Preserves checked state and manual extras the user added.
 */
export async function generateGroceryList(options?: {
  startDate?: string;
  days?: number;
  preserveChecked?: boolean;
}): Promise<GroceryList> {
  const startDate = options?.startDate ?? toDateKey();
  const days = options?.days ?? 7;
  const preserveChecked = options?.preserveChecked ?? true;

  const endDate = format(addDays(parseISO(startDate), days - 1), 'yyyy-MM-dd');
  const plans = await getPlansInRange(startDate, endDate);
  const aggregated = aggregateFromPlans(plans);

  const previous = await getGroceryList();
  const checkedIds = new Set(
    preserveChecked
      ? (previous?.items.filter((i) => i.checked).map((i) => i.id) ?? [])
      : [],
  );
  const plannedIds = new Set(aggregated.map((i) => i.id));
  const manualExtras =
    previous?.items.filter(
      (i) => i.manual && !plannedIds.has(i.id),
    ) ?? [];

  const list: GroceryList = {
    generated_at: new Date().toISOString(),
    range_start: startDate,
    range_end: endDate,
    items: [
      ...aggregated.map((item) => ({
        ...item,
        checked: checkedIds.has(item.id),
        manual: false as const,
      })),
      ...manualExtras.map((item) => ({
        ...item,
        checked: preserveChecked ? item.checked : false,
      })),
    ],
  };

  return saveGroceryList(list);
}

/** Add a custom item (or bring an existing match back to “to buy”). */
export async function addManualGroceryItem(input: {
  name: string;
  note?: string;
}): Promise<GroceryList> {
  const names = [input.name];
  return addManualGroceryItems(
    names.map((name) => ({ name, note: input.note })),
  );
}

/** Add several custom items in one save. */
export async function addManualGroceryItems(
  entries: Array<{ name: string; note?: string }>,
): Promise<GroceryList> {
  const cleaned = entries
    .map((e) => ({
      name: e.name.trim(),
      note: e.note?.trim() || null,
    }))
    .filter((e) => e.name);
  if (cleaned.length === 0) throw new Error('Enter an item name');

  const existing = (await getGroceryList()) ?? emptyGroceryList();
  let items = [...existing.items];

  for (const entry of cleaned) {
    const id = itemKey(null, entry.name);
    const match = items.find(
      (i) =>
        i.id === id ||
        i.name.trim().toLowerCase() === entry.name.toLowerCase(),
    );
    if (match) {
      items = items.map((i) =>
        i.id === match.id
          ? {
              ...i,
              note: entry.note ?? i.note ?? null,
              checked: false,
            }
          : i,
      );
    } else {
      items.push({
        id,
        food_id: null,
        name: entry.name,
        total_grams: 0,
        serving_size_g: 0,
        source_count: 1,
        dates: [],
        checked: false,
        manual: true,
        note: entry.note,
      });
    }
  }

  return saveGroceryList({
    ...existing,
    generated_at: existing.generated_at || new Date().toISOString(),
    items,
  });
}

export async function removeGroceryItem(
  itemId: string,
): Promise<GroceryList | null> {
  const list = await getGroceryList();
  if (!list) return null;
  return saveGroceryList({
    ...list,
    items: list.items.filter((i) => i.id !== itemId),
  });
}

export async function toggleGroceryItem(
  itemId: string,
): Promise<GroceryList | null> {
  const list = await getGroceryList();
  if (!list) return null;
  const next: GroceryList = {
    ...list,
    items: list.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    ),
  };
  return saveGroceryList(next);
}

export async function clearCheckedGroceryItems(): Promise<GroceryList | null> {
  const list = await getGroceryList();
  if (!list) return null;
  const next: GroceryList = {
    ...list,
    items: list.items.map((item) => ({ ...item, checked: false })),
  };
  return saveGroceryList(next);
}

export function groceryProgress(list: GroceryList | null) {
  if (!list || list.items.length === 0) {
    return { checked: 0, total: 0, remaining: 0 };
  }
  const checked = list.items.filter((i) => i.checked).length;
  return {
    checked,
    total: list.items.length,
    remaining: list.items.length - checked,
  };
}

export function formatGroceryAmount(item: GroceryItem): string {
  if (item.manual && item.total_grams <= 0) {
    return item.note?.trim() ? item.note.trim() : 'Added by you';
  }
  const servings =
    item.serving_size_g > 0
      ? round1(item.total_grams / item.serving_size_g)
      : 0;
  const grams = Math.round(item.total_grams);
  if (servings >= 1.05) {
    const label = servings % 1 === 0 ? `${servings}` : servings.toFixed(1);
    const base = `${label}× · ${grams}g`;
    return item.note?.trim() ? `${base} · ${item.note.trim()}` : base;
  }
  if (grams > 0) {
    return item.note?.trim() ? `${grams}g · ${item.note.trim()}` : `${grams}g`;
  }
  return item.note?.trim() ? item.note.trim() : 'Added by you';
}
