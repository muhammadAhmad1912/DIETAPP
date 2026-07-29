import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useInventory } from '@/contexts/InventoryContext';
import { Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';

export function AddInventoryItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddInventoryItem'>>();
  const { addItem } = useInventory();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(route.params?.barcode ?? '');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState('');
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
        source: barcode.trim() ? 'barcode_manual' : 'manual',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="title">Add inventory item</AppText>
      <View style={styles.form}>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Brand" value={brand} onChangeText={setBrand} />
        <Input label="Barcode" value={barcode} onChangeText={setBarcode} />
        <Input
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
        />
        <Input label="Unit" value={unit} onChangeText={setUnit} />
        <Input label="Category" value={category} onChangeText={setCategory} />
        <Button title="Save to Supabase" onPress={save} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md, marginTop: Spacing.md },
});
