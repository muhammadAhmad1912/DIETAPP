import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { addDays, format, parseISO } from 'date-fns';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, Icons } from '@/components/ui/Icon';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { useAppData } from '@/contexts/AppDataContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import {
  addFoodToPlan,
  clearDayPlan,
  getDayPlan,
  planDayTotals,
  removeFoodFromPlan,
} from '@/services/mealPlan/mealPlan';
import { Radius, Spacing } from '@/theme/tokens';
import type { DayMealPlan, Food, MealType } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { friendlyDateLabel, toDateKey } from '@/utils/dates';

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

const mealIcons: Record<MealType, typeof Icons.breakfast> = {
  breakfast: Icons.breakfast,
  lunch: Icons.lunch,
  dinner: Icons.dinner,
  snack: Icons.snack,
};

export function MealPlannerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, recentFoods, searchFoods } = useAppData();
  const { items: inventoryItems } = useInventory();

  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [plan, setPlan] = useState<DayMealPlan | null>(null);
  const [pickerSlot, setPickerSlot] = useState<MealType | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [saving, setSaving] = useState(false);

  const dayOptions = useMemo(() => {
    const start = parseISO(toDateKey());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return {
        key: toDateKey(d),
        label: i === 0 ? 'Today' : format(d, 'EEE'),
        dayNum: format(d, 'd'),
      };
    });
  }, []);

  const load = useCallback(async () => {
    const next = await getDayPlan(selectedDate);
    setPlan(next);
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!pickerSlot) return;
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
              (item.brand?.toLowerCase().includes(q) ?? false),
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
  }, [query, searchFoods, inventoryItems, pickerSlot]);

  const suggestions = useMemo(
    () => [
      ...favorites,
      ...recentFoods.filter((r) => !favorites.some((f) => f.id === r.id)).slice(0, 8),
    ],
    [favorites, recentFoods],
  );

  const totals = plan ? planDayTotals(plan) : null;

  const addFood = async (food: Food) => {
    if (!pickerSlot) return;
    setSaving(true);
    try {
      const next = await addFoodToPlan(selectedDate, pickerSlot, food);
      setPlan(next);
      setPickerSlot(null);
      setQuery('');
      setResults([]);
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (mealType: MealType, itemId: string) => {
    setSaving(true);
    try {
      const next = await removeFoodFromPlan(selectedDate, mealType, itemId);
      setPlan(next);
    } finally {
      setSaving(false);
    }
  };

  const clearDay = () => {
    Alert.alert('Clear this day?', 'Remove all planned foods for this day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const next = await clearDayPlan(selectedDate);
            setPlan(next);
          })();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <AppText variant="title">Meal planner</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Plan meals by day — saved automatically
      </AppText>

      <View style={styles.dayRow}>
        {dayOptions.map((day) => {
          const active = day.key === selectedDate;
          return (
            <Pressable
              key={day.key}
              onPress={() => setSelectedDate(day.key)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={{
                  color: active ? colors.textInverse : colors.textSecondary,
                  fontWeight: '700',
                }}
              >
                {day.label}
              </AppText>
              <AppText
                variant="bodyBold"
                style={{ color: active ? colors.textInverse : colors.text }}
              >
                {day.dayNum}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card tint={colors.cardCalories} style={styles.summary}>
        <AppText variant="bodyBold">{friendlyDateLabel(selectedDate)}</AppText>
        <AppText muted variant="caption">
          {totals
            ? `${totals.count} foods · ${Math.round(totals.calories)} kcal · P ${Math.round(totals.protein_g)} · C ${Math.round(totals.carbs_g)} · F ${Math.round(totals.fat_g)}`
            : 'Loading…'}
        </AppText>
      </Card>

      {MEAL_TYPES.map((meal) => {
        const items = plan?.slots[meal.value] ?? [];
        const slotKcal = items.reduce((s, i) => s + i.calories, 0);
        return (
          <Card key={meal.value} style={styles.slotCard} tint={colors.surface}>
            <View style={styles.slotHead}>
              <View style={styles.slotTitle}>
                <View
                  style={[styles.slotIcon, { backgroundColor: colors.primaryMuted }]}
                >
                  <Icon
                    name={mealIcons[meal.value]}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <AppText variant="subtitle">{meal.label}</AppText>
                  <AppText muted variant="caption">
                    {items.length === 0
                      ? 'Nothing planned'
                      : `${items.length} items · ${Math.round(slotKcal)} kcal`}
                  </AppText>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setPickerSlot(meal.value);
                  setQuery('');
                  setResults([]);
                }}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name={Icons.add} size={20} color={colors.textInverse} />
              </Pressable>
            </View>

            {items.map((item) => (
              <View
                key={item.id}
                style={[styles.itemRow, { backgroundColor: colors.surfaceMuted }]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {item.food_name}
                  </AppText>
                  <AppText muted variant="caption">
                    {Math.round(item.grams)}g · {Math.round(item.calories)} kcal
                  </AppText>
                </View>
                <Pressable
                  onPress={() => void removeItem(meal.value, item.id)}
                  hitSlop={8}
                >
                  <Icon name={Icons.close} size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </Card>
        );
      })}

      <Button
        title="Generate grocery list"
        variant="secondary"
        onPress={() =>
          navigation.navigate('GroceryList', { regenerate: true })
        }
        style={{ marginBottom: Spacing.sm }}
      />

      {(totals?.count ?? 0) > 0 ? (
        <Button
          title="Clear day"
          variant="ghost"
          onPress={clearDay}
          style={{ marginBottom: Spacing.xl }}
        />
      ) : (
        <View style={{ height: Spacing.xl }} />
      )}

      <Modal
        visible={pickerSlot != null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerSlot(null)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setPickerSlot(null)}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText variant="title" style={{ marginBottom: Spacing.xs }}>
              Add to{' '}
              {MEAL_TYPES.find((m) => m.value === pickerSlot)?.label ?? 'meal'}
            </AppText>
            <AppText muted style={{ marginBottom: Spacing.md }}>
              From your food database
            </AppText>
            <Input
              placeholder="Search foods…"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <View style={{ marginTop: Spacing.sm, maxHeight: 360 }}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {(query.trim() ? results : suggestions).length === 0 ? (
                  <Card style={styles.empty}>
                    <AppText muted>
                      {query.trim()
                        ? 'No matches.'
                        : 'Search or pick a favorite / recent food.'}
                    </AppText>
                  </Card>
                ) : (
                  (query.trim() ? results : suggestions).slice(0, 12).map((food) => (
                    <FoodListItem
                      key={food.id}
                      food={food}
                      rightLabel={saving ? '…' : '+ Plan'}
                      onAdd={() => void addFood(food)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setPickerSlot(null)}
              style={{ marginTop: Spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 2,
  },
  summary: {
    marginBottom: Spacing.md,
    gap: 4,
  },
  slotCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
});
