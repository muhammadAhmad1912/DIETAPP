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
import { MealTypeSheet } from '@/components/ui/MealTypeSheet';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { useAppData } from '@/contexts/AppDataContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useMealDraft } from '@/contexts/MealDraftContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import type { Food, FoodSuggestion, MealType } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { filterSuggestions, suggestionDetail } from '@/utils/foodSuggestions';
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
  const {
    recentFoods,
    favorites,
    addMeal,
    searchFoods,
    getSuggestedFoods,
    toggleFavoriteFood,
  } = useAppData();
  const { items: inventoryItems } = useInventory();
  const {
    items,
    addFood,
    adjustServings,
    adjustServingsByFoodId,
    getServingsForFood,
    removeItem,
    clear,
    totals,
  } = useMealDraft();

  const cartRef = useRef<View>(null);

  const [mealType, setMealType] = useState<MealType>(
    (route.params?.mealType as MealType) || 'lunch',
  );
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mealTypeSheetOpen, setMealTypeSheetOpen] = useState(false);

  React.useEffect(() => {
    if (route.params?.mealType) {
      setMealType(route.params.mealType as MealType);
    }
  }, [route.params?.mealType]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getSuggestedFoods(mealType, 8);
      if (!cancelled) setSuggestions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mealType, getSuggestedFoods, recentFoods]);

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

  const suggestedIds = useMemo(
    () => new Set(suggestions.map((s) => s.food.id)),
    [suggestions],
  );

  const matchedSuggestions = useMemo(
    () => filterSuggestions(suggestions, query),
    [suggestions, query],
  );

  const quickPicks = useMemo(() => {
    const invFoods = inventoryItems.slice(0, 8).map(inventoryToFood);
    return {
      favorites: favorites.filter((f) => !suggestedIds.has(f.id)),
      recent: recentFoods.filter(
        (r) => !favorites.some((f) => f.id === r.id) && !suggestedIds.has(r.id),
      ),
      inventory: invFoods.filter(
        (inv) =>
          !suggestedIds.has(inv.id) &&
          !favorites.some((f) => f.name === inv.name) &&
          !recentFoods.some((f) => f.name === inv.name),
      ),
    };
  }, [favorites, recentFoods, inventoryItems, suggestedIds]);

  const withFavoriteFlag = (food: Food): Food => {
    if (food.is_favorite) return food;
    const matched = favorites.some(
      (f) =>
        f.id === food.id ||
        (food.barcode != null &&
          food.barcode.length > 0 &&
          f.barcode === food.barcode) ||
        f.name.toLowerCase() === food.name.toLowerCase(),
    );
    return matched ? { ...food, is_favorite: true } : food;
  };

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
        <Pressable
          accessibilityLabel="Change meal type"
          accessibilityRole="button"
          onPress={() => setMealTypeSheetOpen(true)}
          style={[styles.mealBadge, { backgroundColor: colors.primaryMuted }]}
        >
          <AppText style={{ color: colors.primary, fontWeight: '800' }}>
            {mealLabel}
          </AppText>
          <Icon name={Icons.edit} size={14} color={colors.primary} />
        </Pressable>
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

      {items.length === 0 && !query.trim() && suggestions.length > 0 ? (
        <View style={{ marginTop: Spacing.md }}>
          <View style={styles.sectionHead}>
            <Icon name={Icons.suggest} size={18} color={colors.primary} />
            <AppText variant="subtitle">
              Suggested for {mealLabel.toLowerCase()}
            </AppText>
          </View>
          {suggestions.map((s) => {
            const food = withFavoriteFlag(s.food);
            return (
              <FoodListItem
                key={`sug-${food.id}`}
                food={food}
                detail={suggestionDetail(s)}
                quantity={getServingsForFood(food.id)}
                cartRef={cartRef}
                onAdd={() => addFood(food, s.typical_grams)}
                onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                onToggleFavorite={() => void toggleFavoriteFood(food)}
              />
            );
          })}
        </View>
      ) : null}

      {searchActive ? (
        <View style={{ marginTop: Spacing.sm }}>
          {query.trim() ? (
            <>
              {matchedSuggestions.length > 0 ? (
                <>
                  <View style={styles.sectionHead}>
                    <Icon name={Icons.suggest} size={18} color={colors.primary} />
                    <AppText variant="subtitle">
                      Suggested for {mealLabel.toLowerCase()}
                    </AppText>
                  </View>
                  {matchedSuggestions.map((s) => {
                    const food = withFavoriteFlag(s.food);
                    return (
                      <FoodListItem
                        key={`sug-q-${food.id}`}
                        food={food}
                        detail={suggestionDetail(s)}
                        quantity={getServingsForFood(food.id)}
                        cartRef={cartRef}
                        onAdd={() => {
                          addFood(food, s.typical_grams);
                          setQuery('');
                        }}
                        onAdjust={(delta) =>
                          adjustServingsByFoodId(food.id, delta)
                        }
                        onToggleFavorite={() => void toggleFavoriteFood(food)}
                      />
                    );
                  })}
                </>
              ) : null}

              <AppText
                variant="subtitle"
                style={{
                  marginTop: matchedSuggestions.length > 0 ? Spacing.md : 0,
                  marginBottom: Spacing.sm,
                }}
              >
                Results
              </AppText>
              {searchResults.filter(
                (f) => !matchedSuggestions.some((s) => s.food.id === f.id),
              ).length === 0 ? (
                matchedSuggestions.length === 0 ? (
                  <Card style={styles.emptySearch}>
                    <AppText muted>No matches for “{query.trim()}”.</AppText>
                  </Card>
                ) : null
              ) : (
                searchResults
                  .filter(
                    (f) => !matchedSuggestions.some((s) => s.food.id === f.id),
                  )
                  .slice(0, 10)
                  .map((raw) => {
                    const food = withFavoriteFlag(raw);
                    return (
                      <FoodListItem
                        key={food.id + (food.barcode ?? '')}
                        food={food}
                        quantity={getServingsForFood(food.id)}
                        cartRef={cartRef}
                        onAdd={() => {
                          addFood(food);
                          setQuery('');
                        }}
                        onAdjust={(delta) =>
                          adjustServingsByFoodId(food.id, delta)
                        }
                        onToggleFavorite={() => void toggleFavoriteFood(food)}
                      />
                    );
                  })
              )}
            </>
          ) : (
            <>
              <View style={styles.sectionHead}>
                <Icon name={Icons.star} size={18} color={colors.primary} />
                <AppText variant="subtitle">Favorites</AppText>
              </View>
              {quickPicks.favorites.length === 0 ? (
                <Card tint={colors.cardCalories} style={styles.emptySearch}>
                  <AppText muted style={{ textAlign: 'center' }}>
                    No favorites yet. Tap the star on any food to save it here.
                  </AppText>
                </Card>
              ) : (
                quickPicks.favorites.map((food) => (
                  <FoodListItem
                    key={food.id}
                    food={{ ...food, is_favorite: true }}
                    quantity={getServingsForFood(food.id)}
                    cartRef={cartRef}
                    onAdd={() => addFood(food)}
                    onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
                    onToggleFavorite={() => void toggleFavoriteFood(food)}
                  />
                ))
              )}

              {quickPicks.recent.length > 0 ? (
                <>
                  <AppText
                    variant="subtitle"
                    style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}
                  >
                    Recent
                  </AppText>
                  {quickPicks.recent.slice(0, 6).map((food) => {
                    const flagged = withFavoriteFlag(food);
                    return (
                      <FoodListItem
                        key={food.id}
                        food={flagged}
                        quantity={getServingsForFood(food.id)}
                        cartRef={cartRef}
                        onAdd={() => addFood(food)}
                        onAdjust={(delta) =>
                          adjustServingsByFoodId(food.id, delta)
                        }
                        onToggleFavorite={() => void toggleFavoriteFood(flagged)}
                      />
                    );
                  })}
                </>
              ) : null}

              {quickPicks.inventory.length > 0 ? (
                <>
                  <AppText
                    variant="subtitle"
                    style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}
                  >
                    Inventory
                  </AppText>
                  {quickPicks.inventory.slice(0, 6).map((food) => {
                    const flagged = withFavoriteFlag(food);
                    return (
                      <FoodListItem
                        key={food.id}
                        food={flagged}
                        quantity={getServingsForFood(food.id)}
                        cartRef={cartRef}
                        onAdd={() => addFood(food)}
                        onAdjust={(delta) =>
                          adjustServingsByFoodId(food.id, delta)
                        }
                        onToggleFavorite={() => void toggleFavoriteFood(flagged)}
                      />
                    );
                  })}
                </>
              ) : null}
            </>
          )}
        </View>
      ) : null}

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

      <MealTypeSheet
        visible={mealTypeSheetOpen}
        onClose={() => setMealTypeSheetOpen(false)}
        title="Meal type"
        subtitle="Choose breakfast, lunch, dinner, or snack"
        onSelectMeal={(next) => {
          setMealType(next);
          setMealTypeSheetOpen(false);
        }}
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
