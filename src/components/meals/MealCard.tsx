import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import type { MealWithItems } from '@/types/models';
import { format } from 'date-fns';

interface MealCardProps {
  meal: MealWithItems;
  onPress?: () => void;
}

export function MealCard({ meal, onPress }: MealCardProps) {
  const { colors } = useTheme();
  const label =
    MEAL_TYPES.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type;
  const totals = meal.items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein_g;
      return acc;
    },
    { calories: 0, protein: 0 },
  );

  return (
    <Pressable onPress={onPress}>
      <Card tint={colors.cardMeal} style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.surface }]}>
            <Icon name={Icons.meals} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold">{meal.name || label}</AppText>
            <AppText variant="caption" muted>
              {label} · {format(new Date(meal.logged_at), 'h:mm a')} ·{' '}
              {meal.items.length} item{meal.items.length === 1 ? '' : 's'}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={{ color: colors.primary, fontWeight: '800' }}>
              {Math.round(totals.calories)}
            </AppText>
            <AppText variant="caption" muted>
              kcal
            </AppText>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  icon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
