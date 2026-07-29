import type { BarcodeLookupProvider, BarcodeProduct } from './types';

/**
 * Open Food Facts provider — modular so it can be swapped
 * for Nutritionix, USDA, or a custom API later.
 */
export const openFoodFactsProvider: BarcodeLookupProvider = {
  id: 'open_food_facts',
  name: 'Open Food Facts',

  async lookup(barcode: string): Promise<BarcodeProduct | null> {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
        {
          headers: {
            'User-Agent': 'DietTracker/1.0 (personal; expo)',
          },
        },
      );

      if (!response.ok) return null;

      const data = (await response.json()) as {
        status?: number;
        product?: Record<string, unknown>;
      };

      if (data.status !== 1 || !data.product) return null;

      const product = data.product;
      const nutriments = (product.nutriments ?? {}) as Record<string, number>;
      const servingSize =
        parseServingGrams(product.serving_quantity) ||
        parseServingGrams(product.serving_size) ||
        100;

      const per100 = {
        calories: nutriments['energy-kcal_100g'] ?? nutriments.energy_kcal_100g ?? 0,
        protein: nutriments.proteins_100g ?? 0,
        carbs: nutriments.carbohydrates_100g ?? 0,
        fat: nutriments.fat_100g ?? 0,
        fiber: nutriments.fiber_100g ?? null,
      };

      const factor = servingSize / 100;

      return {
        barcode,
        name:
          (product.product_name as string) ||
          (product.generic_name as string) ||
          'Unknown product',
        brand: (product.brands as string) || null,
        servingSizeG: servingSize,
        calories: Math.round(per100.calories * factor * 10) / 10,
        proteinG: Math.round(per100.protein * factor * 10) / 10,
        carbsG: Math.round(per100.carbs * factor * 10) / 10,
        fatG: Math.round(per100.fat * factor * 10) / 10,
        fiberG:
          per100.fiber == null
            ? null
            : Math.round(per100.fiber * factor * 10) / 10,
        imageUrl: (product.image_front_small_url as string) || null,
        source: 'open_food_facts',
      };
    } catch {
      return null;
    }
  },
};

function parseServingGrams(value: unknown): number {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value !== 'string') return 0;
  const match = value.match(/([\d.]+)\s*g/i);
  if (match) return Number(match[1]);
  const asNum = Number(value);
  return Number.isFinite(asNum) && asNum > 0 ? asNum : 0;
}
