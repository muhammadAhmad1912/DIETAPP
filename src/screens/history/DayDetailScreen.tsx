import React, { useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { MealCard } from '@/components/meals/MealCard';
import { MacroBar } from '@/components/ui/MacroBar';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { localRepo } from '@/services/local/repository';
import { Spacing } from '@/theme/tokens';
import type { DailyTotals } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { friendlyDateLabel } from '@/utils/dates';

export function DayDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'DayDetail'>>();
  const { goals } = useAppData();
  const [day, setDay] = useState<DailyTotals | null>(null);

  useEffect(() => {
    void localRepo.getDailyTotals(route.params.date).then(setDay);
  }, [route.params.date]);

  if (!day || !goals) {
    return (
      <Screen>
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppText variant="title">{friendlyDateLabel(day.date)}</AppText>
      <AppText muted style={{ marginBottom: Spacing.lg }}>
        {Math.round(day.calories)} / {goals.calorie_goal} kcal · {day.water_ml} ml
        water
      </AppText>

      <MacroBar
        label="Protein"
        current={day.protein_g}
        goal={goals.protein_g}
        color={colors.protein}
      />
      <MacroBar
        label="Carbs"
        current={day.carbs_g}
        goal={goals.carbs_g}
        color={colors.carbs}
      />
      <MacroBar
        label="Fat"
        current={day.fat_g}
        goal={goals.fat_g}
        color={colors.fat}
      />

      <AppText variant="subtitle" style={{ marginTop: Spacing.lg }}>
        Meals
      </AppText>
      {day.meals.length === 0 ? (
        <AppText muted>No meals logged.</AppText>
      ) : (
        day.meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
      )}
    </Screen>
  );
}
