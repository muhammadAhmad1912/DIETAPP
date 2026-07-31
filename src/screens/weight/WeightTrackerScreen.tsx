import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { LineChart } from '@/components/charts/LineChart';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import { toDateKey } from '@/utils/dates';
import {
  analyzeWeightTrend,
  buildWeightSeries,
  DUPLICATE_WEIGHT_TODAY,
} from '@/utils/weightTrend';
import { localRepo } from '@/services/local/repository';

export function WeightTrackerScreen() {
  const { colors } = useTheme();
  const { profile, weightLogs, addWeight, refresh } = useAppData();
  const [weight, setWeight] = useState(
    profile ? String(profile.weight_kg) : '',
  );
  const [saving, setSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [infoTone, setInfoTone] = useState<'success' | 'info'>('info');

  const series = useMemo(
    () => buildWeightSeries(weightLogs, 20),
    [weightLogs],
  );
  const trend = useMemo(() => analyzeWeightTrend(series), [series]);

  const alreadyLoggedToday = weightLogs.some(
    (w) => toDateKey(w.logged_at) === toDateKey(),
  );

  const todayLog = weightLogs.find(
    (w) => toDateKey(w.logged_at) === toDateKey(),
  );

  const forecast =
    trend != null
      ? {
          date: trend.forecastDate,
          value: trend.predictedNextWeekKg,
        }
      : null;

  const trendColor =
    trend?.direction === 'down'
      ? colors.success
      : trend?.direction === 'up'
        ? colors.warning
        : colors.primary;

  const save = async () => {
    const value = Number(weight);
    if (!value || value <= 0) {
      Alert.alert('Enter a valid weight');
      return;
    }

    if (alreadyLoggedToday) {
      setInfoTone('info');
      setInfoMessage(DUPLICATE_WEIGHT_TODAY);
      return;
    }

    setSaving(true);
    setInfoMessage(null);
    try {
      await addWeight(value);
      setInfoTone('success');
      setInfoMessage('Morning weight saved. Great job staying consistent!');
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not save weight right now.';
      setInfoTone('info');
      setInfoMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="title">Weight</AppText>
          <AppText muted>
            Current: {profile?.weight_kg.toFixed(1)} kg
          </AppText>
        </View>
        <Icon name={Icons.weight} size={28} color={colors.primary} />
      </View>

      {trend ? (
        <View style={styles.insightRow}>
          <Card tint={colors.cardCalories} style={styles.insightCard}>
            <AppText variant="caption" muted>
              Trend
            </AppText>
            <AppText
              variant="bodyBold"
              style={{ color: trendColor, marginTop: 2 }}
            >
              {trend.label}
            </AppText>
            <AppText variant="caption" muted style={{ marginTop: 2 }}>
              {trend.detail}
            </AppText>
          </Card>
          <Card tint={colors.cardCalories} style={styles.insightCard}>
            <AppText variant="caption" muted>
              Next week
            </AppText>
            <AppText
              variant="bodyBold"
              style={{ color: colors.primary, marginTop: 2 }}
            >
              {trend.predictedNextWeekKg.toFixed(1)} kg
            </AppText>
            <AppText variant="caption" muted style={{ marginTop: 2 }}>
              Projected from your recent pace
            </AppText>
          </Card>
        </View>
      ) : (
        <Card tint={colors.cardCalories} style={styles.hintCard}>
          <AppText muted>
            Log weight on a couple of days to unlock your trend and next-week
            projection.
          </AppText>
        </Card>
      )}

      <Card tint={colors.cardCalories} style={{ marginTop: Spacing.sm }}>
        <View style={styles.chartHead}>
          <AppText variant="subtitle">Weight trend</AppText>
          {forecast ? (
            <AppText variant="caption" muted>
              Dashed = next week
            </AppText>
          ) : null}
        </View>
        <LineChart
          data={series}
          color={colors.primary}
          unit=" kg"
          forecast={forecast}
          emptyLabel="Add at least two weigh-ins to see your chart"
        />
      </Card>

      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Input
          label="Morning weigh-in"
          placeholder="e.g. 75.2"
          value={weight}
          onChangeText={(t) => {
            setWeight(t);
            if (!alreadyLoggedToday) setInfoMessage(null);
          }}
          keyboardType="decimal-pad"
          suffix="kg"
          editable={!alreadyLoggedToday}
        />
        {alreadyLoggedToday ? (
          <Card tint={colors.primaryMuted} style={styles.infoCard}>
            <AppText style={{ color: colors.primary, fontWeight: '600' }}>
              {todayLog
                ? `Today's weigh-in is already saved at ${todayLog.weight_kg.toFixed(1)} kg. Come back tomorrow for your next check-in.`
                : DUPLICATE_WEIGHT_TODAY}
            </AppText>
          </Card>
        ) : infoMessage ? (
          <Card
            tint={
              infoTone === 'success' ? colors.cardCalories : colors.primaryMuted
            }
            style={styles.infoCard}
          >
            <AppText style={{ color: colors.primary, fontWeight: '600' }}>
              {infoMessage}
            </AppText>
          </Card>
        ) : null}
        <Button
          title={alreadyLoggedToday ? 'Already logged today' : 'Save weight'}
          onPress={save}
          loading={saving}
          disabled={alreadyLoggedToday}
        />
      </View>

      <AppText variant="subtitle" style={{ marginTop: Spacing.lg }}>
        History
      </AppText>
      <FlatList
        data={weightLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View>
              <AppText variant="bodyBold">{item.weight_kg.toFixed(1)} kg</AppText>
              <AppText variant="caption" muted>
                {format(new Date(item.logged_at), 'PPp')}
              </AppText>
            </View>
            <Button
              title="Delete"
              variant="ghost"
              onPress={() => {
                Alert.alert('Delete entry?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await localRepo.deleteWeightLog(item.id);
                      await refresh();
                      setInfoMessage(null);
                    },
                  },
                ]);
              }}
            />
          </View>
        )}
      />
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
  insightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  insightCard: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  hintCard: {
    paddingVertical: Spacing.sm,
  },
  chartHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  infoCard: { paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
