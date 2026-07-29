export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string | null;
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  imageUrl: string | null;
  source: string;
}

export interface BarcodeLookupProvider {
  readonly id: string;
  readonly name: string;
  lookup(barcode: string): Promise<BarcodeProduct | null>;
}
