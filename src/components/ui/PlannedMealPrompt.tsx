import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { PlannedFoodItem } from '@/types/models';

export type PlannedMealChoice = 'use' | 'addMore' | 'different';

interface PlannedMealPromptProps {
  visible: boolean;
  mealLabel: string;
  items: PlannedFoodItem[];
  onChoice: (choice: PlannedMealChoice) => void;
}

export function PlannedMealPrompt({
  visible,
  mealLabel,
  items,
  onChoice,
}: PlannedMealPromptProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const totalKcal = Math.round(items.reduce((s, i) => s + i.calories, 0));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onChoice('different')}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={() => onChoice('different')}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.titleRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Icon name={Icons.planner} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="title">Planned {mealLabel.toLowerCase()}</AppText>
              <AppText muted>
                {items.length} food{items.length === 1 ? '' : 's'} · {totalKcal} kcal
              </AppText>
            </View>
          </View>

          <View style={[styles.preview, { backgroundColor: colors.surfaceMuted }]}>
            {items.slice(0, 4).map((item) => (
              <AppText key={item.id} variant="caption" numberOfLines={1}>
                · {item.food_name} ({Math.round(item.grams)}g)
              </AppText>
            ))}
            {items.length > 4 ? (
              <AppText muted variant="caption">
                +{items.length - 4} more
              </AppText>
            ) : null}
          </View>

          <AppText muted style={{ marginBottom: Spacing.md }}>
            How do you want to log this meal?
          </AppText>

          <Option
            icon={Icons.check}
            title="Use planned meal"
            subtitle="Load everything from your plan"
            tint={colors.cardCalories}
            onPress={() => onChoice('use')}
          />
          <Option
            icon={Icons.add}
            title="Use plan & add more"
            subtitle="Start with the plan, then add extra foods"
            tint={colors.cardProtein}
            onPress={() => onChoice('addMore')}
          />
          <Option
            icon={Icons.meals}
            title="Different meal"
            subtitle="Ignore the plan and build a new meal"
            tint={colors.surfaceMuted}
            onPress={() => onChoice('different')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  subtitle,
  tint,
  onPress,
}: {
  icon: typeof Icons.check;
  title: string;
  subtitle: string;
  tint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: pressed ? colors.primaryMuted : tint,
        },
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: colors.surface }]}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText muted variant="caption">
          {subtitle}
        </AppText>
      </View>
      <Icon name={Icons.chevron} size={16} color={colors.tabInactive} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
    marginBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
