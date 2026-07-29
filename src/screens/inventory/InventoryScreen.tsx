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
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { InventoryItem } from '@/types/database';
import type { RootStackParamList } from '@/types/navigation';

export function InventoryScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, loading, syncing, error, sync, removeItem } = useInventory();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.brand?.toLowerCase().includes(q) ?? false) ||
        (item.barcode?.includes(q) ?? false),
    );
  }, [items, query]);

  const confirmDelete = (item: InventoryItem) => {
    Alert.alert('Remove item?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void removeItem(item.id),
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={[styles.header, { paddingHorizontal: Spacing.md }]}>
        <View>
          <AppText variant="title">Inventory</AppText>
          <AppText muted variant="caption">
            {items.length} item{items.length === 1 ? '' : 's'} · synced per user
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <Button
            title="Scan"
            onPress={() =>
              navigation.navigate('BarcodeScanner', { mode: 'inventory' })
            }
            style={{ paddingHorizontal: Spacing.md }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <Input
          placeholder="Search inventory"
          value={query}
          onChangeText={setQuery}
        />
        {error ? (
          <AppText style={{ color: colors.danger, marginTop: Spacing.xs }}>
            {error}
          </AppText>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingBottom: Spacing.xxl,
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
          <Card>
            <AppText variant="bodyBold">No inventory yet</AppText>
            <AppText muted style={{ marginVertical: Spacing.sm }}>
              Scan a barcode or add an item manually. Data syncs to your Supabase
              account.
            </AppText>
            <Button
              title="Add item"
              variant="secondary"
              onPress={() => navigation.navigate('AddInventoryItem')}
            />
          </Card>
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Button
              title="Add item manually"
              variant="secondary"
              onPress={() => navigation.navigate('AddInventoryItem')}
              style={{ marginBottom: Spacing.sm }}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('InventoryItemDetail', { itemId: item.id })
            }
            onLongPress={() => confirmDelete(item)}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText muted variant="caption" numberOfLines={1}>
                {item.brand ? `${item.brand} · ` : ''}
                {item.barcode ?? 'No barcode'} · {item.source}
              </AppText>
            </View>
            <AppText style={{ color: colors.primary, fontWeight: '700' }}>
              {Number(item.quantity)} {item.unit}
            </AppText>
          </Pressable>
        )}
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
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
