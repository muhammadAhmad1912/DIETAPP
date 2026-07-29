import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { useAppData } from '@/contexts/AppDataContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useMealDraft } from '@/contexts/MealDraftContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import type { Food, MealType } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { scaleByGrams } from '@/utils/nutrition';

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

export function AddMealScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddMeal'>>();
  const { recentFoods, favorites, addMeal, searchFoods } = useAppData();
  const { items: inventoryItems } = useInventory();
  const { items, addFood, adjustServings, adjustServingsByFoodId, getServingsForFood, removeItem, clear, totals } =
    useMealDraft();

  const cartRef = useRef<View>(null);

  const [mealType, setMealType] = useState<MealType>(
    (route.params?.mealType as MealType) || 'lunch',
  );
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    if (route.params?.mealType) {
      setMealType(route.params.mealType as MealType);
    }
  }, [route.params?.mealType]);

  React.useEffect(() => {
    if (!searchActive) return;
    const handle = setTimeout(() => {
      void (async () => {
        const q = query.trim().toLowerCase();
        if (!q) {
          setSearchResults([]);
          return;
        }
        const foods = await searchFoods(query);
        const fromInventory = inventoryItems
          .filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              (item.brand?.toLowerCase().includes(q) ?? false) ||
              (item.barcode?.includes(q) ?? false),
          )
          .map(inventoryToFood);
        setSearchResults([
          ...foods,
          ...fromInventory.filter(
            (inv) =>
              !foods.some(
                (f) =>
                  (f.barcode && inv.barcode && f.barcode === inv.barcode) ||
                  f.name === inv.name,
              ),
          ),
        ]);
      })();
    }, 200);
    return () => clearTimeout(handle);
  }, [query, searchFoods, inventoryItems, searchActive]);

  const quickPicks = useMemo(() => {
    const invFoods = inventoryItems.slice(0, 8).map(inventoryToFood);
    return [
      ...favorites,
      ...recentFoods.filter((r) => !favorites.some((f) => f.id === r.id)),
      ...invFoods.filter(
        (inv) =>
          !favorites.some((f) => f.name === inv.name) &&
          !recentFoods.some((f) => f.name === inv.name),
      ),
    ].slice(0, 12);
  }, [favorites, recentFoods, inventoryItems]);

  const mealLabel =
    MEAL_TYPES.find((m) => m.value === mealType)?.label ?? 'Meal';

  const save = async () => {
    if (!items.length) {
      Alert.alert('Add at least one food');
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        name: mealLabel,
        meal_type: mealType,
        items: items.map(({ food, grams }) => {
          const n = scaleByGrams(food, grams);
          return {
            food_id: food.id.startsWith('inv-') ? null : food.id,
            food_name: food.name,
            servings: n.servings,
            serving_size_g: n.serving_size_g,
            calories: n.calories,
            protein_g: n.protein_g,
            carbs_g: n.carbs_g,
            fat_g: n.fat_g,
          };
        }),
      });
      clear();
      setSearchActive(false);
      setQuery('');
      setShowSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  return (
    <Screen scroll>
      <View style={styles.titleRow}>
        <View>
          <AppText variant="title">Add {mealLabel.toLowerCase()}</AppText>
          <AppText muted>Search foods and build your meal</AppText>
        </View>
        <View style={[styles.mealBadge, { backgroundColor: colors.primaryMuted }]}>
          <AppText style={{ color: colors.primary, fontWeight: '800' }}>
            {mealLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Search inventory, favorites, recent…"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchActive(true)}
            onBlur={() => {
              if (!query.trim()) setSearchActive(false);
            }}
          />
        </View>
        <Pressable
          accessibilityLabel="Scan barcode"
          onPress={() =>
            navigation.navigate('BarcodeScanner', { mode: 'meal' })
          }
          style={[styles.scanBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name={Icons.scan} size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      <View ref={cartRef} collapsable={false}>
        {items.length > 0 ? (
          <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <View style={styles.selectedHeader}>
              <Icon name={Icons.meals} size={18} color={colors.primary} />
              <AppText variant="subtitle">Selected ({items.length})</AppText>
            </View>
            {items.map((row) => {
              const n = scaleByGrams(row.food, row.grams);
              const servings =
                Math.round((row.grams / row.food.serving_size_g) * 10) / 10;
              return (
                <View
                  key={row.key}
                  style={[styles.selected, { backgroundColor: colors.surfaceMuted }]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{row.food.name}</AppText>
                    <AppText muted variant="caption">
                      {Math.round(row.grams)}g · {Math.round(n.calories)} kcal
                    </AppText>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => adjustServings(row.key, -1)}
                      style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                    >
                      <Icon name={Icons.remove} size={18} color={colors.text} />
                    </Pressable>
                    <AppText variant="bodyBold" style={styles.stepValue}>
                      {servings}×
                    </AppText>
                    <Pressable
                      onPress={() => adjustServings(row.key, 1)}
                      style={[styles.stepBtn, { backgroundColor: colors.primary }]}
                    >
                      <Icon name={Icons.add} size={18} color={colors.textInverse} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeItem(row.key)} hitSlop={8}>
                    <Icon name={Icons.close} size={18} color={colors.danger} />
                  </Pressable>
                </View>
              );
            })}
            <View style={[styles.totalPill, { backgroundColor: colors.primaryMuted }]}>
              <AppText variant="bodyBold" style={{ color: colors.primary }}>
                Total {Math.round(totals.calories)} kcal · P{' '}
                {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · F{' '}
                {Math.round(totals.fat_g)}
              </AppText>
            </View>
          </Card>
        ) : (
          <Card
            tint={colors.cardCalories}
            style={[styles.emptySearch, { marginTop: Spacing.md }]}
          >
            <Icon name={Icons.meals} size={28} color={colors.primary} />
            <AppText variant="bodyBold">Your meal is empty</AppText>
            <AppText muted style={{ textAlign: 'center' }}>
              Search or scan foods, then use + / − to set servings.
            </AppText>
          </Card>
        )}
      </View>

      {searchActive ? (
        <View style={{ marginTop: Spacing.sm }}>
          {query.trim() ? (
            searchResults.length === 0 ? (
              <Card style={styles.emptySearch}>
                <AppText muted>No matches for “{query.trim()}”.</AppText>
              </Card>
            ) : (
              searchResults.slice(0, 10).map((food) => (
                <FoodListItem
                  key={food.id + (food.barcode ?? '')}
                  food={food}
                  quantity={getServingsForFood(food.id)}
                  cartRef={cartRef}
                  onAdd={() => {
                    addFood(food);
                    setQuery('');
                  }}
                  onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                />
              ))
            )
          ) : (
            <>
              <AppText variant="subtitle" style={{ marginBottom: Spacing.sm }}>
                Inventory, favorites & recent
              </AppText>
              {quickPicks.length === 0 ? (
                <Card style={styles.emptySearch}>
                  <AppText muted>
                    No suggestions yet. Type to search or scan a barcode.
                  </AppText>
                </Card>
              ) : (
                quickPicks.map((food) => (
                  <FoodListItem
                    key={food.id}
                    food={food}
                    quantity={getServingsForFood(food.id)}
                    cartRef={cartRef}
                    onAdd={() => addFood(food)}
                    onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                  />
                ))
              )}
            </>
          )}
        </View>
      ) : (
        <Card tint={colors.cardCalories} style={styles.searchHint}>
          <Icon name={Icons.search} size={26} color={colors.primary} />
          <AppText muted style={{ textAlign: 'center' }}>
            Tap search to browse inventory, favorites, and recent foods.
          </AppText>
        </Card>
      )}

      <Button
        title="Save meal"
        onPress={save}
        loading={saving}
        style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
      />

      <SuccessModal
        visible={showSuccess}
        title="Meal saved"
        message="Your meal was logged and macros are updated."
        onClose={closeSuccess}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mealBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  searchRow: {
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
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 36,
    textAlign: 'center',
  },
  totalPill: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  searchHint: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
});
