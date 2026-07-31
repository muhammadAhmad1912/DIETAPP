import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon, Icons } from '@/components/ui/Icon';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getPeriodInsights,
  type AnalyticsPeriod,
  type PeriodInsights,
} from '@/services/analytics/insights';
import { Radius, Spacing } from '@/theme/tokens';
import {
  analyzeWeightTrend,
  buildWeightSeries,
} from '@/utils/weightTrend';
import type { MainTabParamList } from '@/types/navigation';

export function ProgressScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { goals, weightLogs } = useAppData();
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [insights, setInsights] = useState<PeriodInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPeriodInsights(period, goals);
      setInsights(data);
    } finally {
      setLoading(false);
    }
  }, [period, goals]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const weightSeries = useMemo(
    () => buildWeightSeries(weightLogs, period === 'week' ? 7 : 30),
    [weightLogs, period],
  );
  const weightTrend = useMemo(
    () => analyzeWeightTrend(weightSeries),
    [weightSeries],
  );
  const weightForecast =
    weightTrend != null
      ? {
          date: weightTrend.forecastDate,
          value: weightTrend.predictedNextWeekKg,
        }
      : null;

  const avg = insights?.averagesOnLoggedDays;
  const periodLabel = period === 'week' ? 'Weekly' : 'Monthly';

  return (
    <Screen scroll>
      <AppText variant="title">Progress</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Analytics from your meal history
      </AppText>

      <View style={styles.periodRow}>
        {(['week', 'month'] as const).map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodChip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                style={{
                  color: active ? colors.textInverse : colors.text,
                  fontWeight: '800',
                }}
              >
                {p === 'week' ? 'Weekly' : 'Monthly'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Add weight"
        onPress={() => navigation.navigate('Weight')}
        style={{ marginBottom: Spacing.md }}
      />

      {loading && !insights ? (
        <Card tint={colors.cardCalories} style={styles.card}>
          <ActivityIndicator color={colors.primary} />
        </Card>
      ) : null}

      {insights ? (
        <>
          <View style={styles.scoreRow}>
            <Card tint={colors.cardCalories} style={styles.scoreCard}>
              <View style={[styles.scoreIcon, { backgroundColor: colors.primaryMuted }]}>
                <Icon name={Icons.consistency} size={20} color={colors.primary} />
              </View>
              <AppText variant="caption" muted>
                Consistency
              </AppText>
              <AppText variant="metric" style={{ color: colors.primary, fontSize: 28 }}>
                {insights.consistencyScore}
              </AppText>
              <AppText variant="caption" muted>
                / 100
              </AppText>
            </Card>
            <Card tint={colors.cardCalories} style={styles.scoreCard}>
              <View style={[styles.scoreIcon, { backgroundColor: colors.primaryMuted }]}>
                <Icon name={Icons.streak} size={20} color={colors.primary} />
              </View>
              <AppText variant="caption" muted>
                Streak
              </AppText>
              <AppText variant="metric" style={{ color: colors.primary, fontSize: 28 }}>
                {insights.currentStreak}
              </AppText>
              <AppText variant="caption" muted>
                {insights.currentStreak === 1 ? 'day' : 'days'}
              </AppText>
            </Card>
          </View>

          <Card tint={colors.cardCalories} style={styles.card}>
            <View style={styles.cardHead}>
              <Icon name={Icons.analytics} size={18} color={colors.primary} />
              <AppText variant="subtitle">{periodLabel} insights</AppText>
            </View>
            <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
              {insights.daysLogged}/{insights.daysInPeriod} days logged ·{' '}
              {insights.daysOnTarget} near calorie goal
            </AppText>
            {insights.bullets.map((line, i) => (
              <View key={`bullet-${i}`} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                <AppText style={{ flex: 1 }}>{line}</AppText>
              </View>
            ))}
          </Card>

          <Card tint={colors.cardCalories} style={styles.card}>
            <View style={styles.cardHead}>
              <Icon name={Icons.calories} size={18} color={colors.primary} />
              <AppText variant="subtitle">Average intake</AppText>
            </View>
            <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
              On days you logged meals
            </AppText>
            <View style={styles.avgGrid}>
              <AvgTile
                label="Calories"
                value={`${Math.round(avg?.calories ?? 0)}`}
                unit="kcal"
                tint={colors.cardCalories}
                color={colors.primary}
              />
              <AvgTile
                label="Protein"
                value={`${Math.round(avg?.protein_g ?? 0)}`}
                unit="g"
                tint={colors.cardProtein}
                color={colors.protein}
              />
              <AvgTile
                label="Carbs"
                value={`${Math.round(avg?.carbs_g ?? 0)}`}
                unit="g"
                tint={colors.cardCarbs}
                color={colors.carbs}
              />
              <AvgTile
                label="Fat"
                value={`${Math.round(avg?.fat_g ?? 0)}`}
                unit="g"
                tint={colors.cardFat}
                color={colors.fat}
              />
            </View>
            {goals ? (
              <AppText muted variant="caption" style={{ marginTop: Spacing.sm }}>
                Goals · {goals.calorie_goal} kcal · P {Math.round(goals.protein_g)}g ·
                C {Math.round(goals.carbs_g)}g · F {Math.round(goals.fat_g)}g
              </AppText>
            ) : null}
          </Card>

          <Card tint={colors.cardCalories} style={styles.card}>
            <View style={styles.cardHead}>
              <Icon name={Icons.meals} size={18} color={colors.primary} />
              <AppText variant="subtitle">Most eaten foods</AppText>
            </View>
            {insights.topFoods.length === 0 ? (
              <AppText muted>No foods logged in this period.</AppText>
            ) : (
              insights.topFoods.map((food, index) => (
                <View
                  key={`${food.name}-${index}`}
                  style={[styles.foodRow, { borderBottomColor: colors.border }]}
                >
                  <View style={[styles.rank, { backgroundColor: colors.primaryMuted }]}>
                    <AppText style={{ color: colors.primary, fontWeight: '800' }}>
                      {index + 1}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {food.name}
                    </AppText>
                    <AppText muted variant="caption">
                      {Math.round(food.calories)} kcal total · P{' '}
                      {Math.round(food.protein_g)}g
                    </AppText>
                  </View>
                  <AppText style={{ color: colors.primary, fontWeight: '800' }}>
                    {food.times}×
                  </AppText>
                </View>
              ))
            )}
          </Card>

          <Card style={styles.card} tint={colors.cardCalories}>
            <View style={styles.cardHead}>
              <Icon name={Icons.calories} size={18} color={colors.primary} />
              <AppText variant="subtitle">
                Calories · {period === 'week' ? 'last 7 days' : 'last 30 days'}
              </AppText>
            </View>
            <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
              Avg {Math.round(insights.averages.calories)} kcal / day
              {goals ? ` · goal ${goals.calorie_goal}` : ''}
            </AppText>
            <BarChart
              data={insights.series.map((d) => ({
                date: d.date,
                value: d.calories,
              }))}
              color={colors.primary}
              goal={goals?.calorie_goal}
              height={period === 'month' ? 160 : 180}
            />
          </Card>
        </>
      ) : null}

      <Card style={styles.card} tint={colors.cardCalories}>
        <View style={styles.cardHead}>
          <Icon name={Icons.weight} size={18} color={colors.primary} />
          <AppText variant="subtitle">Weight trend</AppText>
        </View>
        <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
          {weightTrend
            ? `${weightTrend.label} · next week ~${weightTrend.predictedNextWeekKg.toFixed(1)} kg`
            : `Last ${weightSeries.length} entries`}
        </AppText>
        <LineChart
          data={weightSeries}
          color={colors.primary}
          unit=" kg"
          forecast={weightForecast}
          emptyLabel="Add at least two weigh-ins to see your chart"
        />
      </Card>
    </Screen>
  );
}

function AvgTile({
  label,
  value,
  unit,
  tint,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  tint: string;
  color: string;
}) {
  return (
    <View style={[styles.avgTile, { backgroundColor: tint }]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="bodyBold" style={{ color, fontSize: 18 }}>
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  card: { marginBottom: Spacing.md },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 2,
  },
  scoreIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  avgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  avgTile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
