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

  return (
    <Card tint={colors.cardWater}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: `${colors.water}33` }]}>
            <Icon name={Icons.water} size={18} color={colors.water} />
          </View>
          <AppText variant="subtitle">Water</AppText>
        </View>
        <AppText variant="caption" muted>
          {currentMl} / {goalMl} ml
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onAdd(WATER_INCREMENT_ML)}
          style={[styles.chip, { backgroundColor: colors.surface }]}
        >
          <AppText style={{ color: colors.primary, fontWeight: '700' }}>
            +{WATER_INCREMENT_ML} ml
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onAdd(500)}
          style={[styles.chip, { backgroundColor: colors.surface }]}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 14,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.full },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
});
