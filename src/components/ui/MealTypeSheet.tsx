import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { MEAL_TYPES } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import type { MealType } from '@/types/models';

interface MealTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal: (mealType: MealType) => void;
  /** When omitted, the barcode row is hidden (e.g. changing meal type). */
  onScanBarcode?: () => void;
  title?: string;
  subtitle?: string;
}

const mealIcons: Record<MealType, typeof Icons.breakfast> = {
  breakfast: Icons.breakfast,
  lunch: Icons.lunch,
  dinner: Icons.dinner,
  snack: Icons.snack,
};

export function MealTypeSheet({
  visible,
  onClose,
  onSelectMeal,
  onScanBarcode,
  title = 'Add meal',
  subtitle = 'Choose a meal type or scan a barcode',
}: MealTypeSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
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
          <AppText variant="title" style={{ marginBottom: Spacing.sm }}>
            {title}
          </AppText>
          <AppText muted style={{ marginBottom: Spacing.md }}>
            {subtitle}
          </AppText>

          {MEAL_TYPES.map((meal) => (
            <Pressable
              key={meal.value}
              onPress={() => onSelectMeal(meal.value)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? colors.primaryMuted : colors.surfaceMuted,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
                <Icon name={mealIcons[meal.value]} size={22} color={colors.primary} />
              </View>
              <AppText variant="bodyBold">{meal.label}</AppText>
            </Pressable>
          ))}

          {onScanBarcode ? (
            <Pressable
              onPress={onScanBarcode}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? colors.primaryMuted : colors.cardCalories,
                  marginTop: Spacing.sm,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Icon name={Icons.scan} size={22} color={colors.primary} />
              </View>
              <AppText variant="bodyBold">Scan barcode</AppText>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
