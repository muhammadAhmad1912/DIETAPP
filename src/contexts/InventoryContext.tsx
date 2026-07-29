import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { InventoryItem } from '@/types/database';
import {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventory,
  syncInventoryForUser,
  updateInventoryItem,
  upsertInventoryFromBarcode,
  type InventoryDraft,
} from '@/services/supabase/inventory';

interface InventoryContextValue {
  items: InventoryItem[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  addItem: (draft: InventoryDraft) => Promise<InventoryItem>;
  addFromBarcode: (draft: InventoryDraft) => Promise<InventoryItem>;
  updateItem: (
    id: string,
    patch: Partial<InventoryDraft> & { quantity?: number },
  ) => Promise<InventoryItem>;
  removeItem: (id: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchInventory(user.id);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sync = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setError(null);
    try {
      const next = await syncInventoryForUser(user.id);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (draft: InventoryDraft) => {
      if (!user) throw new Error('Sign in required');
      const item = await createInventoryItem(user.id, draft);
      await refresh();
      return item;
    },
    [user, refresh],
  );

  const addFromBarcode = useCallback(
    async (draft: InventoryDraft) => {
      if (!user) throw new Error('Sign in required');
      const item = await upsertInventoryFromBarcode(user.id, draft);
      await refresh();
      return item;
    },
    [user, refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<InventoryDraft> & { quantity?: number }) => {
      if (!user) throw new Error('Sign in required');
      const item = await updateInventoryItem(user.id, id, patch);
      await refresh();
      return item;
    },
    [user, refresh],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Sign in required');
      await deleteInventoryItem(user.id, id);
      await refresh();
    },
    [user, refresh],
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      syncing,
      error,
      refresh,
      sync,
      addItem,
      addFromBarcode,
      updateItem,
      removeItem,
    }),
    [
      items,
      loading,
      syncing,
      error,
      refresh,
      sync,
      addItem,
      addFromBarcode,
      updateItem,
      removeItem,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
