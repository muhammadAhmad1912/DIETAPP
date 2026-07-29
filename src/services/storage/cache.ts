import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageKey } from './keys';

export async function cacheGet<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: StorageKey, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function cacheRemove(key: StorageKey): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function cacheClearAll(keys: StorageKey[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}
