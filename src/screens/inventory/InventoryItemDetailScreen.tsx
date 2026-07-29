import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useInventory } from '@/contexts/InventoryContext';
import { Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';

export function InventoryItemDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'InventoryItemDetail'>>();
  const { items, updateItem, removeItem } = useInventory();
  const item = useMemo(
    () => items.find((i) => i.id === route.params.itemId) ?? null,
    [items, route.params.itemId],
  );
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1');
  const [saving, setSaving] = useState(false);

  if (!item) {
    return (
      <Screen>
        <AppText>Item not found.</AppText>
      </Screen>
    );
  }

  const saveQty = async () => {
    setSaving(true);
    try {
      await updateItem(item.id, { quantity: Number(quantity) || 0 });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="title">{item.name}</AppText>
      <AppText muted style={{ marginBottom: Spacing.lg }}>
        {item.brand ?? 'No brand'}
        {item.barcode ? ` · ${item.barcode}` : ''}
      </AppText>

      <View style={styles.meta}>
        <AppText>Source: {item.source}</AppText>
        {item.calories != null ? (
          <AppText muted>
            {item.calories} kcal
            {item.serving_size_g ? ` / ${item.serving_size_g}g` : ''}
          </AppText>
        ) : null}
      </View>

      <Input
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        suffix={item.unit}
      />

      <Button
        title="Save quantity"
        onPress={saveQty}
        loading={saving}
        style={{ marginTop: Spacing.md }}
      />
      <Button
        title="Delete item"
        variant="danger"
        style={{ marginTop: Spacing.sm }}
        onPress={() => {
          Alert.alert('Delete item?', item.name, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await removeItem(item.id);
                navigation.goBack();
              },
            },
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: 4, marginBottom: Spacing.lg },
});
