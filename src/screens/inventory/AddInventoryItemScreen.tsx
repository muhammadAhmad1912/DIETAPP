import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';

export function AddInventoryItemScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddInventoryItem'>>();
  const { addItem } = useInventory();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(route.params?.barcode ?? '');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('100');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setLoading(true);
    try {
      await addItem({
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        quantity: Number(quantity) || 1,
        unit: unit.trim() || 'pcs',
        category: category.trim() || null,
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
        serving_size_g: serving ? Number(serving) : 100,
        source: barcode.trim() ? 'barcode_manual' : 'manual',
      });
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('MainTabs');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="title">Add food</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Save to your inventory with optional nutrition info.
      </AppText>

      <Card tint={colors.cardCalories} style={styles.section}>
        <AppText variant="subtitle">Details</AppText>
        <Input label="Name" placeholder="e.g. Greek yogurt" value={name} onChangeText={setName} />
        <Input label="Brand" placeholder="Optional" value={brand} onChangeText={setBrand} />
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
            <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="pcs" />
          </View>
        </View>
        <Input label="Category" placeholder="Optional" value={category} onChangeText={setCategory} />
        <View style={styles.barcodeRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Barcode"
              placeholder="Optional"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            onPress={() =>
              navigation.navigate('BarcodeScanner', { mode: 'inventory' })
            }
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
          >
            <Icon name={Icons.scan} size={22} color={colors.textInverse} />
          </Pressable>
        </View>
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
        title="Save to inventory"
        onPress={save}
        loading={loading}
        style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  scanBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
