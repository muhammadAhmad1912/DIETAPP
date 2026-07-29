import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { Icon, Icons } from '@/components/ui/Icon';
import { WaterTracker } from '@/components/water/WaterTracker';
import { MealCard } from '@/components/meals/MealCard';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';
import { friendlyDateLabel } from '@/utils/dates';
import { progressRatio } from '@/utils/nutrition';

export function DashboardScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { today, goals, profile, addWater, selectedDate } = useAppData();

  if (!today || !goals || !profile) {
    return (
      <Screen>
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  const remaining = Math.max(0, goals.calorie_goal - today.calories);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <AppText variant="label" muted>
            {friendlyDateLabel(selectedDate)}
          </AppText>
          <AppText variant="title">Today</AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate('AddMeal')}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name={Icons.add} size={18} color={colors.textInverse} />
          <AppText style={{ color: colors.textInverse, fontWeight: '800' }}>
            Meal
          </AppText>
        </Pressable>
      </View>

      <Card tint={colors.cardCalories} style={styles.heroCard}>
        <ProgressRing
          progress={progressRatio(today.calories, goals.calorie_goal)}
          color={colors.primary}
          label="Calories"
          value={String(Math.round(today.calories))}
          sublabel={`${remaining} left of ${goals.calorie_goal}`}
          icon={Icons.calories}
        />
      </Card>

      <View style={styles.macros}>
        <MacroBar
          label="Protein"
          current={today.protein_g}
          goal={goals.protein_g}
          color={colors.protein}
          tint={colors.cardProtein}
          icon={Icons.protein}
        />
        <MacroBar
          label="Carbs"
          current={today.carbs_g}
          goal={goals.carbs_g}
          color={colors.carbs}
          tint={colors.cardCarbs}
          icon={Icons.carbs}
        />
        <MacroBar
          label="Fat"
          current={today.fat_g}
          goal={goals.fat_g}
          color={colors.fat}
          tint={colors.cardFat}
          icon={Icons.fat}
        />
      </View>

      <View style={{ marginTop: Spacing.lg }}>
        <WaterTracker
          currentMl={today.water_ml}
          goalMl={profile.water_goal_ml}
          onAdd={(amount) => void addWater(amount)}
        />
      </View>

      <View style={styles.mealsHeader}>
        <View style={styles.mealsTitle}>
          <Icon name={Icons.meals} size={20} color={colors.primary} />
          <AppText variant="subtitle">Today&apos;s meals</AppText>
        </View>
        <Pressable onPress={() => navigation.navigate('FoodSearch')}>
          <AppText style={{ color: colors.primary, fontWeight: '700' }}>
            Search
          </AppText>
        </Pressable>
      </View>

      {today.meals.length === 0 ? (
        <Card tint={colors.cardMeal} style={styles.empty}>
          <Icon name={Icons.meals} size={32} color={colors.primary} />
          <AppText variant="bodyBold" style={{ marginTop: Spacing.sm }}>
            No meals yet
          </AppText>
          <AppText muted style={{ textAlign: 'center', marginVertical: Spacing.sm }}>
            Log your first meal to see calories and macros fill in.
          </AppText>
          <Button
            title="Add meal"
            onPress={() => navigation.navigate('AddMeal')}
            style={{ alignSelf: 'stretch', marginTop: Spacing.sm }}
          />
        </Card>
      ) : (
        today.meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onPress={() =>
              navigation.navigate('MealDetail', { mealId: meal.id })
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  macros: { gap: Spacing.sm },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  mealsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
