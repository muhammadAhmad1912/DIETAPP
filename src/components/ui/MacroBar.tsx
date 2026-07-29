import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Icon, Icons, type AppIconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import { progressRatio } from '@/utils/nutrition';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
  icon?: AppIconName;
  tint?: string;
}

export function MacroBar({
  label,
  current,
  goal,
  color,
  unit = 'g',
  icon,
  tint,
}: MacroBarProps) {
  const { colors } = useTheme();
  const ratio = progressRatio(current, goal);
  const iconMap: Record<string, AppIconName> = {
    Protein: Icons.protein,
    Carbs: Icons.carbs,
    Fat: Icons.fat,
    Calories: Icons.calories,
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.labelRow}>
          <View style={[styles.iconBubble, { backgroundColor: `${color}22` }]}>
            <Icon
              name={icon ?? iconMap[label] ?? Icons.calories}
              size={16}
              color={color}
            />
          </View>
          <AppText variant="bodyBold">{label}</AppText>
        </View>
        <AppText variant="caption" muted>
          {Math.round(current)}
          {unit} / {Math.round(goal)}
          {unit}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${Math.round(ratio * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
