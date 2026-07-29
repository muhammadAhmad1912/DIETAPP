import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { localRepo } from '@/services/local/repository';
import { Spacing } from '@/theme/tokens';
import type { DailyTotals } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';
import { friendlyDateLabel } from '@/utils/dates';

export function DailyHistoryScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { goals, setSelectedDate } = useAppData();
  const [rows, setRows] = useState<DailyTotals[]>([]);

  useEffect(() => {
    void (async () => {
      const dates = await localRepo.getHistoryDates(21);
      const totals = await Promise.all(
        dates.map((d) => localRepo.getDailyTotals(d)),
      );
      setRows(totals);
    })();
  }, []);

  return (
    <Screen scroll>
      <AppText variant="title">Daily history</AppText>
      <AppText muted style={{ marginBottom: Spacing.md }}>
        Review past days and jump back into any log.
      </AppText>

      {rows.map((day) => {
        const goalKcal = goals?.calorie_goal;
        const over =
          goalKcal && day.calories > goalKcal ? colors.accent : colors.primary;
        return (
          <Pressable
            key={day.date}
            onPress={() => {
              setSelectedDate(day.date);
              navigation.navigate('DayDetail', { date: day.date });
            }}
          >
            <Card style={styles.card} tint={colors.cardCalories}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">
                    {friendlyDateLabel(day.date)}
                  </AppText>
                  <AppText variant="caption" muted>
                    {day.meals.length} meals · {day.water_ml} ml water
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText style={{ color: over, fontWeight: '800' }}>
                    {Math.round(day.calories)} kcal
                  </AppText>
                  {goalKcal ? (
                    <AppText variant="caption" muted>
                      of {goalKcal} goal
                    </AppText>
                  ) : null}
                </View>
              </View>
              <AppText variant="caption" muted>
                P {Math.round(day.protein_g)}
                {goals ? ` / ${Math.round(goals.protein_g)}g` : 'g'}
                {' · '}C {Math.round(day.carbs_g)}
                {goals ? ` / ${Math.round(goals.carbs_g)}g` : 'g'}
                {' · '}F {Math.round(day.fat_g)}
                {goals ? ` / ${Math.round(goals.fat_g)}g` : 'g'}
              </AppText>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: Spacing.sm,
  },
});
