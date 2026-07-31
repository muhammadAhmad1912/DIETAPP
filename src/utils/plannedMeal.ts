import type { Food, PlannedFoodItem } from '@/types/models';

/** Convert a saved plan item back into a Food + grams for the meal draft. */
export function plannedItemToDraftEntry(item: PlannedFoodItem): {
  food: Food;
  grams: number;
} {
  const now = new Date().toISOString();
  const serving =
    item.serving_size_g > 0
      ? item.serving_size_g
      : item.grams > 0
        ? item.grams
        : 100;
  const grams = item.grams > 0 ? item.grams : serving;
  const factor = grams / serving;

  return {
    food: {
      id: item.food_id ?? `plan-${item.id}`,
      name: item.food_name,
      brand: null,
      barcode: null,
      serving_size_g: serving,
      calories: factor > 0 ? item.calories / factor : item.calories,
      protein_g: factor > 0 ? item.protein_g / factor : item.protein_g,
      carbs_g: factor > 0 ? item.carbs_g / factor : item.carbs_g,
      fat_g: factor > 0 ? item.fat_g / factor : item.fat_g,
      fiber_g: null,
      source: 'custom',
      is_favorite: false,
      last_used_at: null,
      created_at: now,
      updated_at: now,
    },
    grams,
  };
}
