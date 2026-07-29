import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Icon, Icons } from '@/components/ui/Icon';
import { InventoryAddSheet } from '@/components/ui/InventoryAddSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { InventoryItem } from '@/types/database';
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';

type InventoryNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Inventory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function InventoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<InventoryNav>();
  const { user } = useAuth();
  const { items, loading, syncing, error, sync, removeItem } = useInventory();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.brand?.toLowerCase().includes(q) ?? false) ||
        (item.barcode?.includes(q) ?? false) ||
        (item.category?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const confirmDelete = (item: InventoryItem) => {
    Alert.alert('Delete food?', `Remove “${item.name}” from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void removeItem(item.id),
      },
    ]);
  };

  const openAdd = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to manage inventory.');
      return;
    }
    setAddOpen(true);
  };

  return (
    <Screen padded={false}>
      <View style={[styles.header, { paddingHorizontal: Spacing.md }]}>
        <View>
          <AppText variant="title">Inventory</AppText>
          <AppText muted variant="caption">
            {items.length} food{items.length === 1 ? '' : 's'} · pull to sync
          </AppText>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={Icons.inventory} size={16} color={colors.primary} />
          <AppText style={{ color: colors.primary, fontWeight: '800' }}>
            {items.length}
          </AppText>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Search foods…"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <Pressable
          accessibilityLabel="Add to inventory"
          onPress={openAdd}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: colors.primary,
            },
          ]}
        >
          <Icon name={Icons.add} size={26} color={colors.textInverse} />
        </Pressable>
      </View>

      {error ? (
        <AppText
          style={{
            color: colors.danger,
            paddingHorizontal: Spacing.md,
            marginBottom: Spacing.sm,
          }}
        >
          {error}
        </AppText>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingBottom: Spacing.xxl + 40,
          gap: Spacing.sm,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading || syncing}
            onRefresh={() => void sync()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Card tint={colors.cardCalories} style={styles.empty}>
            <Icon name={Icons.inventory} size={36} color={colors.primary} />
            <AppText variant="bodyBold" style={{ marginTop: Spacing.sm }}>
              {query.trim() ? 'No matches' : 'No inventory yet'}
            </AppText>
            <AppText muted style={{ textAlign: 'center', marginVertical: Spacing.sm }}>
              {query.trim()
                ? 'Try a different search.'
                : 'Add foods manually or scan a barcode. Items sync to your account.'}
            </AppText>
            {!query.trim() ? (
              <Button title="Add food" onPress={openAdd} style={{ alignSelf: 'stretch' }} />
            ) : null}
          </Card>
        }
        renderItem={({ item }) => (
          <Card tint={colors.cardCalories} style={styles.itemCard} elevated={false}>
            <Pressable
              onPress={() =>
                navigation.navigate('InventoryItemDetail', { itemId: item.id })
              }
              style={styles.itemMain}
            >
              <View style={[styles.itemIcon, { backgroundColor: colors.surface }]}>
                <Icon name={Icons.calories} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText muted variant="caption" numberOfLines={1}>
                  {item.brand ? `${item.brand} · ` : ''}
                  {item.calories != null
                    ? `${Math.round(item.calories)} kcal`
                    : 'No macros'}
                  {item.barcode ? ` · ${item.barcode}` : ''}
                </AppText>
              </View>
              <AppText style={{ color: colors.primary, fontWeight: '800' }}>
                {Number(item.quantity)} {item.unit}
              </AppText>
            </Pressable>
            <View style={styles.itemActions}>
              <Pressable
                onPress={() =>
                  navigation.navigate('InventoryItemDetail', { itemId: item.id })
                }
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                hitSlop={6}
              >
                <Icon name={Icons.edit} size={18} color={colors.primary} />
                <AppText
                  variant="caption"
                  style={{ color: colors.primary, fontWeight: '700' }}
                >
                  Edit
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(item)}
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                hitSlop={6}
              >
                <Icon name={Icons.trash} size={18} color={colors.danger} />
                <AppText
                  variant="caption"
                  style={{ color: colors.danger, fontWeight: '700' }}
                >
                  Delete
                </AppText>
              </Pressable>
            </View>
          </Card>
        )}
      />

      <InventoryAddSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAddManual={() => {
          setAddOpen(false);
          navigation.navigate('AddInventoryItem');
        }}
        onScanBarcode={() => {
          setAddOpen(false);
          navigation.navigate('BarcodeScanner', { mode: 'inventory' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  itemCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
});
