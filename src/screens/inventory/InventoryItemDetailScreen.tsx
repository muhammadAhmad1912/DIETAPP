import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';

export function InventoryItemDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'InventoryItemDetail'>>();
  const { items, updateItem, removeItem } = useInventory();
  const item = useMemo(
    () => items.find((i) => i.id === route.params.itemId) ?? null,
    [items, route.params.itemId],
  );

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('100');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setBrand(item.brand ?? '');
    setBarcode(item.barcode ?? '');
    setQuantity(String(item.quantity));
    setUnit(item.unit);
    setCategory(item.category ?? '');
    setCalories(item.calories != null ? String(item.calories) : '');
    setProtein(item.protein_g != null ? String(item.protein_g) : '');
    setCarbs(item.carbs_g != null ? String(item.carbs_g) : '');
    setFat(item.fat_g != null ? String(item.fat_g) : '');
    setServing(item.serving_size_g != null ? String(item.serving_size_g) : '100');
  }, [item]);

  if (!item) {
    return (
      <Screen>
        <AppText>Item not found.</AppText>
      </Screen>
    );
  }

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setSaving(true);
    try {
      await updateItem(item.id, {
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        quantity: Number(quantity) || 0,
        unit: unit.trim() || 'pcs',
        category: category.trim() || null,
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
        serving_size_g: serving ? Number(serving) : null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="title">Edit food</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Source: {item.source}
      </AppText>

      <Card tint={colors.cardCalories} style={styles.section}>
        <AppText variant="subtitle">Details</AppText>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Brand" value={brand} onChangeText={setBrand} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Unit" value={unit} onChangeText={setUnit} />
          </View>
        </View>
        <Input label="Category" value={category} onChangeText={setCategory} />
        <Input
          label="Barcode"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="number-pad"
        />
      </Card>

      <Card tint={colors.cardProtein} style={styles.section}>
        <AppText variant="subtitle">Nutrition (per serving)</AppText>
        <Input
          label="Serving size"
          value={serving}
          onChangeText={setServing}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.surface}
        />
        <Input
          label="Calories"
          value={calories}
          onChangeText={setCalories}
          keyboardType="decimal-pad"
          suffix="kcal"
          tint={colors.cardCalories}
        />
        <Input
          label="Protein"
          value={protein}
          onChangeText={setProtein}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardProtein}
        />
        <Input
          label="Carbs"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardCarbs}
        />
        <Input
          label="Fat"
          value={fat}
          onChangeText={setFat}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardFat}
        />
      </Card>

      <Button
        title="Save changes"
        onPress={save}
        loading={saving}
        style={{ marginTop: Spacing.sm }}
      />
      <Button
        title="Delete food"
        variant="danger"
        style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }}
        onPress={() => {
          Alert.alert('Delete food?', item.name, [
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
  section: { gap: Spacing.sm, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
});
