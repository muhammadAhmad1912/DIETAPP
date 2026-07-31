import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { WATER_INCREMENT_ML } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import { progressRatio } from '@/utils/nutrition';

interface WaterTrackerProps {
  currentMl: number;
  goalMl: number;
  onAdd: (amount?: number) => void;
}

export function WaterTracker({ currentMl, goalMl, onAdd }: WaterTrackerProps) {
  const { colors } = useTheme();
  const ratio = progressRatio(currentMl, goalMl);
  const pct = Math.round(ratio * 100);

  return (
    <Card tint={colors.cardWater} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.primaryMuted }]}>
            <Icon name={Icons.water} size={18} color={colors.primary} />
          </View>
          <View>
            <AppText variant="subtitle">Water</AppText>
            <AppText variant="caption" muted>
              {currentMl} / {goalMl} ml
            </AppText>
          </View>
        </View>
        <View style={[styles.pctPill, { backgroundColor: colors.primaryMuted }]}>
          <AppText style={{ color: colors.primary, fontWeight: '800' }}>
            {pct}%
          </AppText>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, pct)}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onAdd(WATER_INCREMENT_ML)}
          style={[styles.chip, { backgroundColor: colors.primary }]}
        >
          <AppText style={{ color: colors.textInverse, fontWeight: '700' }}>
            +{WATER_INCREMENT_ML} ml
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onAdd(500)}
          style={[
            styles.chip,
            { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 },
          ]}
        >
          <AppText style={{ color: colors.primary, fontWeight: '700' }}>
            +500 ml
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  track: {
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.full },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
});
