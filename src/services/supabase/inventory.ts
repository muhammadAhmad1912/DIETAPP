import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InventoryItem, InventoryItemInsert } from '@/types/database';
import { StorageKeys } from '@/services/storage/keys';
import { isSupabaseConfigured, supabase } from './client';

export type InventoryDraft = {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  quantity?: number;
  unit?: string;
  category?: string | null;
  notes?: string | null;
  image_url?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  serving_size_g?: number | null;
  source?: string;
};

function cacheKeyForUser(userId: string): string {
  return `${StorageKeys.INVENTORY}:${userId}`;
}

async function writeLocalCache(userId: string, items: InventoryItem[]) {
  await AsyncStorage.setItem(cacheKeyForUser(userId), JSON.stringify(items));
}

async function readLocalCache(userId: string): Promise<InventoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKeyForUser(userId));
    if (!raw) return [];
    return JSON.parse(raw) as InventoryItem[];
  } catch {
    return [];
  }
}

/** Fetch current user's inventory from Supabase and refresh local cache. */
export async function fetchInventory(userId: string): Promise<InventoryItem[]> {
  if (!isSupabaseConfigured) {
    return readLocalCache(userId);
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[inventory] fetch failed, using cache', error.message);
    return readLocalCache(userId);
  }

  const items = data ?? [];
  await writeLocalCache(userId, items);
  return items;
}

/** Upsert by barcode for the signed-in user (increments quantity if exists). */
export async function upsertInventoryFromBarcode(
  userId: string,
  draft: InventoryDraft,
): Promise<InventoryItem> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  if (draft.barcode) {
    const { data: existing, error: findError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('barcode', draft.barcode)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const nextQty = Number(existing.quantity) + (draft.quantity ?? 1);
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          quantity: nextQty,
          name: draft.name || existing.name,
          brand: draft.brand ?? existing.brand,
          image_url: draft.image_url ?? existing.image_url,
          calories: draft.calories ?? existing.calories,
          protein_g: draft.protein_g ?? existing.protein_g,
          carbs_g: draft.carbs_g ?? existing.carbs_g,
          fat_g: draft.fat_g ?? existing.fat_g,
          serving_size_g: draft.serving_size_g ?? existing.serving_size_g,
          source: draft.source ?? existing.source,
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;
      await refreshCacheAfterMutation(userId);
      return data;
    }
  }

  const payload: InventoryItemInsert = {
    user_id: userId,
    name: draft.name,
    brand: draft.brand ?? null,
    barcode: draft.barcode ?? null,
    quantity: draft.quantity ?? 1,
    unit: draft.unit ?? 'pcs',
    category: draft.category ?? null,
    notes: draft.notes ?? null,
    image_url: draft.image_url ?? null,
    calories: draft.calories ?? null,
    protein_g: draft.protein_g ?? null,
    carbs_g: draft.carbs_g ?? null,
    fat_g: draft.fat_g ?? null,
    serving_size_g: draft.serving_size_g ?? null,
    source: draft.source ?? 'manual',
  };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  await refreshCacheAfterMutation(userId);
  return data;
}

export async function createInventoryItem(
  userId: string,
  draft: InventoryDraft,
): Promise<InventoryItem> {
  return upsertInventoryFromBarcode(userId, draft);
}

export async function updateInventoryItem(
  userId: string,
  id: string,
  patch: Partial<InventoryDraft> & { quantity?: number },
): Promise<InventoryItem> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('inventory_items')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  await refreshCacheAfterMutation(userId);
  return data;
}

export async function deleteInventoryItem(
  userId: string,
  id: string,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  await refreshCacheAfterMutation(userId);
}

async function refreshCacheAfterMutation(userId: string) {
  const { data } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  await writeLocalCache(userId, data ?? []);
}

/** Pull remote inventory for the signed-in user into local cache. */
export async function syncInventoryForUser(userId: string): Promise<InventoryItem[]> {
  return fetchInventory(userId);
}
