import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
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
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { friendlyDateLabel, toDateKey } from '@/utils/dates';
import { progressRatio } from '@/utils/nutrition';

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<DashboardNav>();
  const { today, goals, profile, addWater, selectedDate, weightLogs } =
    useAppData();

  const weightDelta = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const latest = weightLogs[0]?.weight_kg;
    const previous = weightLogs[1]?.weight_kg;
    if (latest == null || previous == null) return null;
    return latest - previous;
  }, [weightLogs]);

  if (!today || !goals || !profile) {
    return (
      <Screen>
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  const remaining = Math.max(0, goals.calorie_goal - today.calories);
  const caloriePct = Math.round(
    progressRatio(today.calories, goals.calorie_goal) * 100,
  );
  const currentWeight = profile.weight_kg;
  const weighedToday = weightLogs.some(
    (w) => toDateKey(w.logged_at) === toDateKey(selectedDate),
  );

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
          onPress={() => navigation.navigate('Inventory')}
          style={({ pressed }) => [
            styles.inventoryBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Icon name={Icons.inventory} size={18} color={colors.textInverse} />
          <AppText style={{ color: colors.textInverse, fontWeight: '800' }}>
            Inventory
          </AppText>
        </Pressable>
      </View>

      <Card tint={colors.cardCalories} style={styles.heroCard}>
        <ProgressRing
          progress={progressRatio(today.calories, goals.calorie_goal)}
          color={colors.primary}
          label="Calories"
          value={String(Math.round(today.calories))}
          sublabel={`${remaining} left`}
          icon={Icons.calories}
        />
        <View style={styles.heroStats}>
          <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
            <AppText variant="caption" muted>
              Goal
            </AppText>
            <AppText variant="bodyBold" style={{ color: colors.primary }}>
              {goals.calorie_goal}
            </AppText>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
            <AppText variant="caption" muted>
              Eaten
            </AppText>
            <AppText variant="bodyBold" style={{ color: colors.primary }}>
              {Math.round(today.calories)}
            </AppText>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="caption" muted>
              Progress
            </AppText>
            <AppText variant="bodyBold" style={{ color: colors.primary }}>
              {caloriePct}%
            </AppText>
          </View>
        </View>
      </Card>

      <Pressable onPress={() => navigation.navigate('Weight')}>
        <Card tint={colors.cardCalories} style={styles.weightCard}>
          <View style={[styles.weightIcon, { backgroundColor: colors.primaryMuted }]}>
            <Icon name={Icons.weight} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" muted>
              Current weight
            </AppText>
            <AppText variant="title" style={{ color: colors.primary, fontSize: 22 }}>
              {currentWeight.toFixed(1)} kg
            </AppText>
            <AppText variant="caption" muted>
              {weighedToday
                ? 'Logged today'
                : weightDelta != null
                  ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg vs last entry`
                  : 'Tap to log morning weigh-in'}
            </AppText>
          </View>
          <Icon name={Icons.chevron} size={18} color={colors.primary} />
        </Card>
      </Pressable>

      <AppText variant="subtitle" style={styles.sectionLabel}>
        Macros
      </AppText>
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

      <View style={{ marginTop: Spacing.md }}>
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
        <Card tint={colors.cardCalories} style={styles.empty}>
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
  inventoryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  statChip: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  weightIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
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
