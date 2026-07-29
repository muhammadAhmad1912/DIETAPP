import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { localRepo } from '@/services/local/repository';
import { MEAL_TYPES } from '@/constants/config';
import { Spacing } from '@/theme/tokens';
import type { MealWithItems } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { format } from 'date-fns';

export function MealDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MealDetail'>>();
  const { deleteMeal } = useAppData();
  const [meal, setMeal] = useState<MealWithItems | null>(null);

  useEffect(() => {
    void localRepo.getMealWithItems(route.params.mealId).then(setMeal);
  }, [route.params.mealId]);

  if (!meal) {
    return (
      <Screen>
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  const label =
    MEAL_TYPES.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type;
  const totals = meal.items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein_g;
      acc.carbs += item.carbs_g;
      acc.fat += item.fat_g;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Screen scroll>
      <AppText variant="title">{meal.name}</AppText>
      <AppText muted>
        {label} · {format(new Date(meal.logged_at), 'PPp')}
      </AppText>

      <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        {meal.items.map((item) => (
          <View
            key={item.id}
            style={[styles.item, { borderColor: colors.border }]}
          >
            <AppText variant="bodyBold">{item.food_name}</AppText>
            <AppText muted variant="caption">
              {item.servings} × {item.serving_size_g / item.servings}g ·{' '}
              {Math.round(item.calories)} kcal
            </AppText>
          </View>
        ))}
      </View>

      <AppText style={{ marginTop: Spacing.md }}>
        Total: {Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g ·
        C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g
      </AppText>

      <Button
        title="Delete meal"
        variant="danger"
        style={{ marginTop: Spacing.xl }}
        onPress={() => {
          Alert.alert('Delete meal?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deleteMeal(meal.id);
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
  item: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
  },
});
