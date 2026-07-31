import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { MealTypeSheet } from '@/components/ui/MealTypeSheet';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { useAppData } from '@/contexts/AppDataContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import { evaluateCanIEat } from '@/utils/canIEat';
import { localRepo } from '@/services/local/repository';
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

export function CanIEatThisScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CanIEatThis'>>();
  const { today, goals, favorites, recentFoods, searchFoods, addMeal, refresh } =
    useAppData();
  const { items: inventoryItems } = useInventory();

  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(true);
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingFood, setLoadingFood] = useState(false);

  // Prefill from barcode / deep link
  useEffect(() => {
    const foodId = route.params?.foodId;
    const barcode = route.params?.barcode;
    if (!foodId && !barcode) return;
    setLoadingFood(true);
    void (async () => {
      try {
        const foods = await localRepo.getFoods();
        const found =
          (foodId ? foods.find((f) => f.id === foodId) : undefined) ??
          (barcode ? foods.find((f) => f.barcode === barcode) : undefined);
        if (found) {
          setSelected(found);
          setGrams(String(found.serving_size_g || 100));
          setSearchActive(false);
        }
      } finally {
        setLoadingFood(false);
      }
    })();
  }, [route.params?.foodId, route.params?.barcode]);

  useEffect(() => {
    if (!searchActive || selected) return;
    const handle = setTimeout(() => {
      void (async () => {
        const q = query.trim().toLowerCase();
        if (!q) {
          setResults([]);
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
        setResults([
          ...foods,
          ...fromInventory.filter(
            (inv) => !foods.some((f) => f.name === inv.name),
          ),
        ]);
      })();
    }, 200);
    return () => clearTimeout(handle);
  }, [query, searchFoods, inventoryItems, searchActive, selected]);

  const suggestions = useMemo(
    () => [
      ...favorites,
      ...recentFoods.filter((r) => !favorites.some((f) => f.id === r.id)),
      ...inventoryItems
        .slice(0, 8)
        .map(inventoryToFood)
        .filter(
          (inv) =>
            !favorites.some((f) => f.name === inv.name) &&
            !recentFoods.some((f) => f.name === inv.name),
        ),
    ],
    [favorites, recentFoods, inventoryItems],
  );

  const gramsValue = Math.max(0, Number(grams) || 0);

  const verdict = useMemo(() => {
    if (!selected || !today || !goals || gramsValue <= 0) return null;
    return evaluateCanIEat({
      food: selected,
      grams: gramsValue,
      today: {
        calories: today.calories,
        protein_g: today.protein_g,
        carbs_g: today.carbs_g,
        fat_g: today.fat_g,
      },
      goals,
    });
  }, [selected, today, goals, gramsValue]);

  const pickFood = (food: Food) => {
    setSelected(food);
    setGrams(String(food.serving_size_g || 100));
    setQuery('');
    setSearchActive(false);
  };

  const adjustServing = (delta: number) => {
    if (!selected) return;
    const step = selected.serving_size_g > 0 ? selected.serving_size_g : 100;
    const next = Math.max(step * 0.5, gramsValue + delta * step);
    setGrams(String(Math.round(next * 10) / 10));
  };

  const logFood = async (mealType: MealType) => {
    if (!selected || !verdict || gramsValue <= 0) return;
    setMealSheetOpen(false);
    setSaving(true);
    try {
      const n = scaleByGrams(selected, gramsValue);
      const label =
        MEAL_TYPES.find((m) => m.value === mealType)?.label ?? 'Snack';
      await addMeal({
        name: label,
        meal_type: mealType,
        items: [
          {
            food_id: selected.id.startsWith('inv-') ? null : selected.id,
            food_name: selected.name,
            servings: n.servings,
            serving_size_g: n.serving_size_g,
            calories: n.calories,
            protein_g: n.protein_g,
            carbs_g: n.carbs_g,
            fat_g: n.fat_g,
          },
        ],
      });
      await refresh();
      setShowSuccess(true);
    } catch (e) {
      Alert.alert('Could not log', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (!today || !goals) {
    return (
      <Screen>
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  if (loadingFood) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppText variant="title">Can I eat this?</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Check a food against today&apos;s remaining budget
      </AppText>

      <Card tint={colors.cardCalories} style={styles.budgetCard}>
        <AppText variant="caption" muted>
          Remaining today
        </AppText>
        <AppText variant="bodyBold" style={{ color: colors.primary }}>
          {Math.max(0, Math.round(goals.calorie_goal - today.calories))} kcal · P{' '}
          {Math.max(0, Math.round(goals.protein_g - today.protein_g))}g · C{' '}
          {Math.max(0, Math.round(goals.carbs_g - today.carbs_g))}g · F{' '}
          {Math.max(0, Math.round(goals.fat_g - today.fat_g))}g
        </AppText>
      </Card>

      {!selected ? (
        <>
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Search a food…"
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchActive(true)}
                autoFocus
              />
            </View>
            <Pressable
              accessibilityLabel="Scan barcode"
              onPress={() =>
                navigation.navigate('BarcodeScanner', { mode: 'canIEat' })
              }
              style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            >
              <Icon name={Icons.scan} size={22} color={colors.textInverse} />
            </Pressable>
          </View>

          {searchActive ? (
            <View style={{ marginTop: Spacing.sm }}>
              {query.trim() ? (
                results.length === 0 ? (
                  <Card style={styles.empty}>
                    <AppText muted>No matches.</AppText>
                  </Card>
                ) : (
                  results.slice(0, 12).map((food) => (
                    <FoodListItem
                      key={food.id + (food.barcode ?? '')}
                      food={food}
                      rightLabel="Check"
                      onAdd={() => pickFood(food)}
                    />
                  ))
                )
              ) : (
                <>
                  <AppText variant="subtitle" style={{ marginBottom: Spacing.sm }}>
                    Favorites & recent
                  </AppText>
                  {suggestions.length === 0 ? (
                    <Card tint={colors.cardCalories} style={styles.empty}>
                      <AppText muted style={{ textAlign: 'center' }}>
                        Search or scan a barcode to check a food.
                      </AppText>
                    </Card>
                  ) : (
                    suggestions.slice(0, 10).map((food) => (
                      <FoodListItem
                        key={food.id}
                        food={food}
                        rightLabel="Check"
                        onAdd={() => pickFood(food)}
                      />
                    ))
                  )}
                </>
              )}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Card tint={colors.cardCalories} style={styles.selectedCard}>
            <View style={styles.selectedHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">{selected.name}</AppText>
                <AppText muted variant="caption">
                  {selected.brand ? `${selected.brand} · ` : ''}
                  {Math.round(selected.calories)} kcal / {selected.serving_size_g}g
                </AppText>
              </View>
              <Pressable
                onPress={() => {
                  setSelected(null);
                  setSearchActive(true);
                }}
                hitSlop={8}
              >
                <Icon name={Icons.close} size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Input
              label="Amount"
              value={grams}
              onChangeText={setGrams}
              keyboardType="decimal-pad"
              suffix="g"
              tint={colors.surface}
            />
            <View style={styles.stepper}>
              <Pressable
                onPress={() => adjustServing(-1)}
                style={[styles.stepBtn, { backgroundColor: colors.surface }]}
              >
                <Icon name={Icons.remove} size={18} color={colors.text} />
              </Pressable>
              <AppText variant="bodyBold">
                {selected.serving_size_g > 0
                  ? `${Math.round((gramsValue / selected.serving_size_g) * 10) / 10}× serving`
                  : 'Portion'}
              </AppText>
              <Pressable
                onPress={() => adjustServing(1)}
                style={[styles.stepBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name={Icons.add} size={18} color={colors.textInverse} />
              </Pressable>
            </View>
          </Card>

          {verdict ? (
            <Card
              tint={verdict.fits ? colors.cardCalories : colors.cardMeal}
              style={styles.verdictCard}
            >
              <View style={styles.verdictHead}>
                <Icon
                  name={verdict.fits ? Icons.check : Icons.warning}
                  size={26}
                  color={verdict.fits ? colors.primary : colors.accent}
                />
                <AppText variant="subtitle">
                  {verdict.fits ? 'Yes — this fits' : 'Over goal if you eat this'}
                </AppText>
              </View>

              <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
                This portion · {Math.round(verdict.portion.calories)} kcal · P{' '}
                {Math.round(verdict.portion.protein_g)} · C{' '}
                {Math.round(verdict.portion.carbs_g)} · F{' '}
                {Math.round(verdict.portion.fat_g)}
              </AppText>

              <MacroCompare
                label="Calories"
                before={verdict.remainingBefore.calories}
                after={verdict.remainingAfter.calories}
                unit="kcal"
                color={colors.primary}
              />
              <MacroCompare
                label="Protein"
                before={verdict.remainingBefore.protein_g}
                after={verdict.remainingAfter.protein_g}
                unit="g"
                color={colors.protein}
              />
              <MacroCompare
                label="Carbs"
                before={verdict.remainingBefore.carbs_g}
                after={verdict.remainingAfter.carbs_g}
                unit="g"
                color={colors.carbs}
              />
              <MacroCompare
                label="Fat"
                before={verdict.remainingBefore.fat_g}
                after={verdict.remainingAfter.fat_g}
                unit="g"
                color={colors.fat}
              />

              <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                {verdict.advice.map((line, i) => (
                  <View key={`advice-${i}`} style={styles.adviceRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: verdict.fits
                            ? colors.primary
                            : colors.accent,
                        },
                      ]}
                    />
                    <AppText style={{ flex: 1 }}>{line}</AppText>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Button
            title={
              verdict?.fits
                ? 'Yes — log this food'
                : 'Log it anyway'
            }
            onPress={() => setMealSheetOpen(true)}
            loading={saving}
            style={{ marginTop: Spacing.md }}
          />
          <Button
            title="Pick a different food"
            variant="secondary"
            onPress={() => {
              setSelected(null);
              setSearchActive(true);
            }}
            style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }}
          />
        </>
      )}

      <MealTypeSheet
        visible={mealSheetOpen}
        onClose={() => setMealSheetOpen(false)}
        onSelectMeal={(mealType) => void logFood(mealType)}
        title="Add to which meal?"
        subtitle="We'll log this food under the meal you pick"
      />

      <SuccessModal
        visible={showSuccess}
        title="Logged"
        message="Food was added to your day. Macros are updated."
        onClose={() => {
          setShowSuccess(false);
          setSelected(null);
          setSearchActive(true);
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate('MainTabs');
        }}
      />
    </Screen>
  );
}

function MacroCompare({
  label,
  before,
  after,
  unit,
  color,
}: {
  label: string;
  before: number;
  after: number;
  unit: string;
  color: string;
}) {
  const { colors } = useTheme();
  const over = after < 0;
  return (
    <View style={[styles.compareRow, { borderBottomColor: colors.border }]}>
      <AppText variant="bodyBold" style={{ width: 72 }}>
        {label}
      </AppText>
      <AppText
        muted
        variant="caption"
        style={{ flex: 1, color: over ? colors.accent : colors.textSecondary }}
      >
        {Math.round(before)}
        {unit} → {Math.round(after)}
        {unit}
        {over ? ' over' : ' left'}
      </AppText>
      <View
        style={[
          styles.afterPill,
          { backgroundColor: over ? `${colors.accent}22` : `${color}22` },
        ]}
      >
        <AppText
          variant="caption"
          style={{ color: over ? colors.accent : color, fontWeight: '800' }}
        >
          {over ? `+${Math.round(Math.abs(after))}` : Math.round(after)}
          {unit}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  budgetCard: {
    marginBottom: Spacing.md,
    gap: 4,
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
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  selectedCard: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectedHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictCard: {
    gap: Spacing.xs,
  },
  verdictHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  adviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  afterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
});
