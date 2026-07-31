import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { localRepo } from '@/services/local/repository';
import { Spacing } from '@/theme/tokens';
import { toDateKey } from '@/utils/dates';
import type { MainTabParamList } from '@/types/navigation';

export function ProgressScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { goals, weightLogs } = useAppData();
  const [calorieSeries, setCalorieSeries] = useState<
    Array<{ date: string; calories: number }>
  >([]);

  useEffect(() => {
    void localRepo.getWeeklyCalorieSeries().then(setCalorieSeries);
  }, []);

  const weightSeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const w of [...weightLogs].reverse()) {
      byDay.set(toDateKey(w.logged_at), w.weight_kg);
    }
    return [...byDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .slice(-14);
  }, [weightLogs]);

  const avgCalories =
    calorieSeries.length === 0
      ? 0
      : calorieSeries.reduce((s, d) => s + d.calories, 0) / calorieSeries.length;

  return (
    <Screen scroll>
      <AppText variant="title">Progress</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Trends across calories and weight.
      </AppText>

      <Button
        title="Add weight"
        onPress={() => navigation.navigate('Weight')}
        style={{ marginBottom: Spacing.md }}
      />

      <Card style={styles.card} tint={colors.cardCalories}>
        <View style={styles.cardHead}>
          <Icon name={Icons.calories} size={18} color={colors.primary} />
          <AppText variant="subtitle">Calories · last 7 days</AppText>
        </View>
        <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
          Avg {Math.round(avgCalories)} kcal
          {goals ? ` · goal ${goals.calorie_goal}` : ''}
        </AppText>
        <BarChart
          data={calorieSeries.map((d) => ({ date: d.date, value: d.calories }))}
          color={colors.primary}
          goal={goals?.calorie_goal}
        />
      </Card>

      <Card style={styles.card} tint={colors.cardCalories}>
        <View style={styles.cardHead}>
          <Icon name={Icons.weight} size={18} color={colors.primary} />
          <AppText variant="subtitle">Weight trend</AppText>
        </View>
        <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
          Last {weightSeries.length} entries
        </AppText>
        <LineChart data={weightSeries} color={colors.primary} unit=" kg" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
});
