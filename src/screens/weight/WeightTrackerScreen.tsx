import React, { useState } from 'react';
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
import { Spacing } from '@/theme/tokens';
import { toDateKey } from '@/utils/dates';
import { localRepo } from '@/services/local/repository';

export function WeightTrackerScreen() {
  const { colors } = useTheme();
  const { profile, weightLogs, addWeight, refresh } = useAppData();
  const [weight, setWeight] = useState(
    profile ? String(profile.weight_kg) : '',
  );
  const [saving, setSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // One point per day (latest log wins) so chart keys/dates stay unique
  const series = (() => {
    const byDay = new Map<string, number>();
    for (const w of [...weightLogs].reverse()) {
      byDay.set(toDateKey(w.logged_at), w.weight_kg);
    }
    return [...byDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .slice(-20);
  })();

  const alreadyLoggedToday = weightLogs.some(
    (w) => toDateKey(w.logged_at) === toDateKey(),
  );

  const save = async () => {
    const value = Number(weight);
    if (!value || value <= 0) {
      Alert.alert('Enter a valid weight');
      return;
    }

    if (alreadyLoggedToday) {
      setInfoMessage(
        "You've already logged your weight today. Come back tomorrow for your next morning check-in.",
      );
      return;
    }

    setSaving(true);
    setInfoMessage(null);
    try {
      await addWeight(value);
      setInfoMessage('Morning weight saved. Great job staying consistent!');
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

      <Card tint={colors.cardCalories}>
        <LineChart data={series} color={colors.primary} unit=" kg" />
      </Card>

      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Input
          label="Morning weigh-in"
          placeholder="e.g. 75.2"
          value={weight}
          onChangeText={(t) => {
            setWeight(t);
            setInfoMessage(null);
          }}
          keyboardType="decimal-pad"
          suffix="kg"
        />
        {infoMessage ? (
          <Card tint={colors.primaryMuted} style={styles.infoCard}>
            <AppText style={{ color: colors.primary, fontWeight: '600' }}>
              {infoMessage}
            </AppText>
          </Card>
        ) : null}
        <Button title="Save weight" onPress={save} loading={saving} />
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
  infoCard: { paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
