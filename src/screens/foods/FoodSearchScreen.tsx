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
import { MEAL_TYPES } from '@/constants/config';
import { Spacing } from '@/theme/tokens';
import type { Food, FoodSuggestion, MealType } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { filterSuggestions, suggestionDetail } from '@/utils/foodSuggestions';

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
  const favoritesMode = route.params?.mode === 'favorites';
  const mealType = (route.params?.mealType as MealType | undefined) ?? 'lunch';
  const mealLabel =
    MEAL_TYPES.find((m) => m.value === mealType)?.label ?? 'Meal';
  const { searchFoods, toggleFavoriteFood, favorites, recentFoods, getSuggestedFoods } =
    useAppData();
  const { items: inventoryItems } = useInventory();
  const { addFood, adjustServingsByFoodId, getServingsForFood } = useMealDraft();
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(favoritesMode);
  const [results, setResults] = useState<Food[]>([]);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const cartRef = useRef<View>(null);

  useEffect(() => {
    if (favoritesMode) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = await getSuggestedFoods(mealType, 8);
      if (!cancelled) setSuggestions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mealType, getSuggestedFoods, recentFoods, favoritesMode]);

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

  const onSelect = (food: Food, grams?: number) => {
    addFood(food, grams);
    if (selectForMeal) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('AddMeal');
      return;
    }
    navigation.navigate('AddMeal');
  };

  const onAddStay = (food: Food, grams?: number) => {
    addFood(food, grams);
  };

  const suggestedIds = useMemo(
    () => new Set(suggestions.map((s) => s.food.id)),
    [suggestions],
  );

  const matchedSuggestions = useMemo(
    () => filterSuggestions(suggestions, query),
    [suggestions, query],
  );

  const sections = useMemo(
    () => ({
      favorites: favorites.filter((f) => !suggestedIds.has(f.id)),
      recent: recentFoods.filter(
        (r) => !favorites.some((f) => f.id === r.id) && !suggestedIds.has(r.id),
      ),
      inventory: inventoryItems
        .slice(0, 10)
        .map(inventoryToFood)
        .filter(
          (inv) =>
            !suggestedIds.has(inv.id) &&
            !favorites.some((f) => f.name === inv.name) &&
            !recentFoods.some((f) => f.name === inv.name),
        ),
    }),
    [favorites, recentFoods, inventoryItems, suggestedIds],
  );

  const renderSuggestion = (s: FoodSuggestion) => {
    const food = withFavoriteFlag(s.food);
    return (
      <FoodListItem
        key={`sug-${food.id}`}
        food={food}
        detail={suggestionDetail(s)}
        quantity={getServingsForFood(food.id)}
        cartRef={cartRef}
        onAdd={() =>
          selectForMeal
            ? onAddStay(food, s.typical_grams)
            : onSelect(food, s.typical_grams)
        }
        onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
        onToggleFavorite={() => void toggleFavoriteFood(food)}
      />
    );
  };

  const renderFood = (food: Food) => {
    const flagged = withFavoriteFlag(food);

    if (favoritesMode) {
      return (
        <FoodListItem
          key={food.id}
          food={flagged}
          rightLabel={flagged.is_favorite ? 'Saved' : 'Favorite'}
          onAdd={() => {
            if (!flagged.is_favorite) void toggleFavoriteFood(flagged);
          }}
          onToggleFavorite={() => void toggleFavoriteFood(flagged)}
        />
      );
    }

    return (
      <FoodListItem
        key={food.id}
        food={flagged}
        quantity={getServingsForFood(food.id)}
        cartRef={cartRef}
        onAdd={() => (selectForMeal ? onAddStay(food) : onSelect(food))}
        onAdjust={(delta) => adjustServingsByFoodId(food.id, delta)}
        onToggleFavorite={() => void toggleFavoriteFood(flagged)}
      />
    );
  };

  return (
    <Screen scroll>
      <AppText variant="title">
        {favoritesMode
          ? 'Add favorites'
          : selectForMeal
            ? 'Add to meal'
            : 'Food search'}
      </AppText>
      <AppText muted style={{ marginTop: Spacing.xs }}>
        {favoritesMode
          ? 'Tap the star or Favorite to save foods for quick access.'
          : 'Includes your inventory items'}
      </AppText>
      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Input
          placeholder={
            favoritesMode
              ? 'Search foods to favorite…'
              : 'Tap to search favorites, recent & inventory'
          }
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchActive(true)}
          onBlur={() => {
            if (!query.trim() && !favoritesMode) setSearchActive(false);
          }}
          autoFocus={favoritesMode}
        />
        {!favoritesMode ? (
          <Button
            title="Scan barcode"
            variant="secondary"
            onPress={() =>
              navigation.navigate('BarcodeScanner', {
                mode: selectForMeal ? 'meal' : 'inventory',
              })
            }
          />
        ) : null}
      </View>

      {!favoritesMode ? (
        <View ref={cartRef} collapsable={false} style={styles.cartAnchor} />
      ) : null}

      {searchActive ? (
        query.trim() ? (
          <>
            {!favoritesMode && matchedSuggestions.length > 0 ? (
              <>
                <View style={[styles.sectionHead, { marginTop: Spacing.lg }]}>
                  <Icon name={Icons.suggest} size={18} color={colors.primary} />
                  <AppText variant="subtitle">
                    Suggested for {mealLabel.toLowerCase()}
                  </AppText>
                </View>
                {matchedSuggestions.map(renderSuggestion)}
              </>
            ) : null}

            <AppText variant="subtitle" style={styles.section}>
              Results
            </AppText>
            {results.filter(
              (f) => !matchedSuggestions.some((s) => s.food.id === f.id),
            ).length === 0 ? (
              matchedSuggestions.length === 0 ? (
                <Card style={styles.empty}>
                  <AppText muted>No foods found.</AppText>
                </Card>
              ) : null
            ) : (
              results
                .filter(
                  (f) => !matchedSuggestions.some((s) => s.food.id === f.id),
                )
                .map(renderFood)
            )}
          </>
        ) : (
          <>
            {!favoritesMode && suggestions.length > 0 ? (
              <>
                <View style={[styles.sectionHead, { marginTop: Spacing.lg }]}>
                  <Icon name={Icons.suggest} size={18} color={colors.primary} />
                  <AppText variant="subtitle">
                    Suggested for {mealLabel.toLowerCase()}
                  </AppText>
                </View>
                {suggestions.map(renderSuggestion)}
              </>
            ) : null}

            {!favoritesMode ? (
              <>
                <View
                  style={[
                    styles.sectionHead,
                    {
                      marginTop:
                        suggestions.length > 0 ? Spacing.md : Spacing.lg,
                    },
                  ]}
                >
                  <Icon name={Icons.star} size={18} color={colors.primary} />
                  <AppText variant="subtitle">Favorites</AppText>
                </View>
                {sections.favorites.length === 0 ? (
                  <Card tint={colors.cardCalories} style={styles.empty}>
                    <AppText muted style={{ textAlign: 'center' }}>
                      No favorites yet. Tap the star on any food to save it.
                    </AppText>
                  </Card>
                ) : (
                  sections.favorites.map(renderFood)
                )}
              </>
            ) : (
              <AppText muted style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
                Suggested foods — tap Favorite or the star to save.
              </AppText>
            )}

            {sections.recent.length > 0 ? (
              <>
                <AppText variant="subtitle" style={styles.section}>
                  Recent
                </AppText>
                {sections.recent.map(renderFood)}
              </>
            ) : null}

            {sections.inventory.length > 0 ? (
              <>
                <AppText variant="subtitle" style={styles.section}>
                  Inventory
                </AppText>
                {sections.inventory.map(renderFood)}
              </>
            ) : null}

            {favoritesMode &&
            sections.recent.length === 0 &&
            sections.inventory.length === 0 ? (
              <Card tint={colors.cardCalories} style={styles.empty}>
                <AppText muted style={{ textAlign: 'center' }}>
                  Type a food name above to find and favorite it.
                </AppText>
              </Card>
            ) : null}
          </>
        )
      ) : (
        <Card tint={colors.cardCalories} style={styles.idle}>
          <Icon name={Icons.search} size={28} color={colors.primary} />
          <AppText variant="bodyBold">Start searching</AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            Tap search for personalized suggestions, favorites, and inventory.
          </AppText>
        </Card>
      )}

      {favoritesMode ? (
        <Button
          title="Done"
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Favorites');
          }}
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
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
