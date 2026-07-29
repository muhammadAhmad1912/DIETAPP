import { openFoodFactsProvider } from './openFoodFacts';
import type { BarcodeLookupProvider, BarcodeProduct } from './types';

const providers: BarcodeLookupProvider[] = [openFoodFactsProvider];

export function registerBarcodeProvider(provider: BarcodeLookupProvider): void {
  const existing = providers.findIndex((p) => p.id === provider.id);
  if (existing >= 0) {
    providers[existing] = provider;
  } else {
    providers.push(provider);
  }
}

/** Try each registered provider until one returns a product. */
export async function lookupBarcode(
  barcode: string,
): Promise<BarcodeProduct | null> {
  for (const provider of providers) {
    const result = await provider.lookup(barcode);
    if (result) return result;
  }
  return null;
}

export type { BarcodeProduct, BarcodeLookupProvider };
