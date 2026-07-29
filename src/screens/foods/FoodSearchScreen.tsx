import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { useAppData } from '@/contexts/AppDataContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useMealDraft } from '@/contexts/MealDraftContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Icon, Icons } from '@/components/ui/Icon';
import { Spacing } from '@/theme/tokens';
import type { Food } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';

function inventoryToFood(item: {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  serving_size_g: number | null;
}): Food {
  const now = new Date().toISOString();
  return {
    id: `inv-${item.id}`,
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    serving_size_g: item.serving_size_g ?? 100,
    calories: item.calories ?? 0,
    protein_g: item.protein_g ?? 0,
    carbs_g: item.carbs_g ?? 0,
    fat_g: item.fat_g ?? 0,
    fiber_g: null,
    source: 'custom',
    is_favorite: false,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  };
}

export function FoodSearchScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FoodSearch'>>();
  const selectForMeal = Boolean(route.params?.selectForMeal);
  const { searchFoods, toggleFavorite, favorites, recentFoods } = useAppData();
  const { items: inventoryItems } = useInventory();
  const { addFood, adjustServingsByFoodId, getServingsForFood } = useMealDraft();
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [results, setResults] = useState<Food[]>([]);
  const cartRef = useRef<View>(null);

  useEffect(() => {
    if (!searchActive) return;
    const handle = setTimeout(() => {
      void (async () => {
        if (!query.trim()) {
          setResults([]);
          return;
        }
        const q = query.trim().toLowerCase();
        const foods = await searchFoods(query);
        const fromInventory = inventoryItems
          .filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              (item.brand?.toLowerCase().includes(q) ?? false) ||
              (item.barcode?.includes(q) ?? false),
          )
          .map(inventoryToFood);
        setResults([
          ...foods,
          ...fromInventory.filter(
            (inv) => !foods.some((f) => f.name === inv.name),
          ),
        ]);
      })();
    }, 200);
    return () => clearTimeout(handle);
  }, [query, searchFoods, inventoryItems, searchActive]);

  const onSelect = (food: Food) => {
    addFood(food);
    if (selectForMeal) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('AddMeal');
      return;
    }
    navigation.navigate('AddMeal');
  };

  const onAddStay = (food: Food) => {
    addFood(food);
  };

  const suggestions = useMemo(
    () => [
      ...favorites,
      ...recentFoods.filter((r) => !favorites.some((f) => f.id === r.id)),
      ...inventoryItems
        .slice(0, 10)
        .map(inventoryToFood)
        .filter(
          (inv) =>
            !favorites.some((f) => f.name === inv.name) &&
            !recentFoods.some((f) => f.name === inv.name),
        ),
    ],
    [favorites, recentFoods, inventoryItems],
  );

  return (
    <Screen scroll>
      <AppText variant="title">
        {selectForMeal ? 'Add to meal' : 'Food search'}
      </AppText>
      <AppText muted style={{ marginTop: Spacing.xs }}>
        Includes your inventory items
      </AppText>
      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Input
          placeholder="Tap to search favorites, recent & inventory"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchActive(true)}
          onBlur={() => {
            if (!query.trim()) setSearchActive(false);
          }}
        />
        <Button
          title="Scan barcode"
          variant="secondary"
          onPress={() =>
            navigation.navigate('BarcodeScanner', {
              mode: selectForMeal ? 'meal' : 'inventory',
            })
          }
        />
      </View>

      <View ref={cartRef} collapsable={false} style={styles.cartAnchor} />

      {searchActive ? (
        <>
          <AppText variant="subtitle" style={styles.section}>
            {query.trim() ? 'Results' : 'Favorites, recent & suggested'}
          </AppText>
          {query.trim() ? (
            results.length === 0 ? (
              <Card style={styles.empty}>
                <AppText muted>No foods found.</AppText>
              </Card>
            ) : (
              results.map((food) => (
                <FoodListItem
                  key={food.id}
                  food={food}
                  quantity={getServingsForFood(food.id)}
                  cartRef={cartRef}
                  onAdd={() => (selectForMeal ? onAddStay(food) : onSelect(food))}
                  onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                  onToggleFavorite={
                    food.id.startsWith('inv-')
                      ? undefined
                      : () => void toggleFavorite(food.id)
                  }
                />
              ))
            )
          ) : suggestions.length === 0 ? (
            <Card style={styles.empty}>
              <AppText muted>No suggestions yet.</AppText>
            </Card>
          ) : (
            suggestions.map((food) => (
              <FoodListItem
                key={food.id}
                food={food}
                quantity={getServingsForFood(food.id)}
                cartRef={cartRef}
                onAdd={() => (selectForMeal ? onAddStay(food) : onSelect(food))}
                onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                onToggleFavorite={
                  food.id.startsWith('inv-')
                    ? undefined
                    : () => void toggleFavorite(food.id)
                }
              />
            ))
          )}
        </>
      ) : (
        <Card tint={colors.cardCalories} style={styles.idle}>
          <Icon name={Icons.search} size={28} color={colors.primary} />
          <AppText variant="bodyBold">Start searching</AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            Tap the search bar to reveal favorites, recent foods, and suggestions.
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg },
  idle: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  cartAnchor: {
    height: 1,
    marginTop: Spacing.sm,
  },
});
