import React, { useRef, useState, type RefObject } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type View as RNView,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { Food } from '@/types/models';

interface FoodListItemProps {
  food: Food;
  /** Current servings in the meal draft (0 = not added). */
  quantity?: number;
  onAdd?: () => void;
  onAdjust?: (delta: number) => void;
  onToggleFavorite?: () => void;
  /** Destination for the fly-to-cart animation. */
  cartRef?: RefObject<RNView | null>;
  rightLabel?: string;
  /** @deprecated Prefer onAdd + quantity */
  onPress?: () => void;
}

const FLY_MS = 280;

export function FoodListItem({
  food,
  quantity = 0,
  onAdd,
  onAdjust,
  onToggleFavorite,
  cartRef,
  rightLabel = '+ Add',
  onPress,
}: FoodListItemProps) {
  const { colors } = useTheme();
  const rowRef = useRef<View>(null);
  const [flying, setFlying] = useState(false);
  const [flyLabel, setFlyLabel] = useState(food.name);
  const glow = useSharedValue(0);
  const flyX = useSharedValue(0);
  const flyY = useSharedValue(0);
  const flyScale = useSharedValue(1);
  const flyOpacity = useSharedValue(1);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.12 + glow.value * 0.5,
    borderColor: glow.value > 0.05 ? colors.primary : colors.border,
    borderWidth: StyleSheet.hairlineWidth + glow.value * 1.8,
    transform: [{ scale: 1 + glow.value * 0.015 }],
  }));

  const flyStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: flyX.value,
    top: flyY.value,
    opacity: flyOpacity.value,
    transform: [{ scale: flyScale.value }],
  }));

  const pulseGlow = () => {
    glow.value = withSequence(
      withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) }),
    );
  };

  const finishAdd = () => {
    setFlying(false);
    onAdd?.();
    if (!onAdd) onPress?.();
  };

  const startAdd = () => {
    if (quantity > 0) {
      onAdjust?.(1);
      pulseGlow();
      return;
    }

    pulseGlow();

    const source = rowRef.current;
    const cart = cartRef?.current;
    if (!source || !cart) {
      finishAdd();
      return;
    }

    source.measureInWindow((sx, sy) => {
      cart.measureInWindow((tx, ty, tw, th) => {
        setFlyLabel(food.name);
        setFlying(true);
        flyX.value = sx;
        flyY.value = sy;
        flyScale.value = 1;
        flyOpacity.value = 1;

        const endX = tx + Math.max(tw / 2 - 70, 8);
        const endY = ty + Math.max(th / 2 - 18, 4);

        flyX.value = withTiming(endX, {
          duration: FLY_MS,
          easing: Easing.inOut(Easing.cubic),
        });
        flyY.value = withTiming(endY, {
          duration: FLY_MS,
          easing: Easing.inOut(Easing.cubic),
        });
        flyScale.value = withTiming(0.55, {
          duration: FLY_MS,
          easing: Easing.in(Easing.cubic),
        });
        flyOpacity.value = withTiming(
          0,
          { duration: FLY_MS, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(finishAdd)();
          },
        );
      });
    });
  };

  const inMeal = quantity > 0;

  return (
    <>
      <View ref={rowRef} collapsable={false}>
        <Animated.View
          style={[
            styles.row,
            glowStyle,
            {
              backgroundColor: inMeal ? colors.primaryMuted : colors.surface,
              shadowColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.cardCalories }]}>
            <Icon name={Icons.calories} size={18} color={colors.primary} />
          </View>
          <Pressable
            style={styles.main}
            onPress={inMeal ? undefined : startAdd}
            disabled={inMeal}
          >
            <AppText variant="bodyBold" numberOfLines={1}>
              {food.name}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {food.brand ? `${food.brand} · ` : ''}
              {Math.round(food.calories)} kcal · {food.serving_size_g}g
            </AppText>
          </Pressable>
          {onToggleFavorite ? (
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={12}
              accessibilityLabel="Toggle favorite"
            >
              <Icon
                name={food.is_favorite ? Icons.star : Icons.starOutline}
                size={20}
                color={food.is_favorite ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          ) : null}
          {inMeal && onAdjust ? (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => {
                  onAdjust(-1);
                  pulseGlow();
                }}
                style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                hitSlop={6}
              >
                <Icon name={Icons.remove} size={16} color={colors.text} />
              </Pressable>
              <AppText variant="bodyBold" style={styles.stepValue}>
                {quantity % 1 === 0 ? quantity : quantity.toFixed(1)}×
              </AppText>
              <Pressable
                onPress={() => {
                  onAdjust(1);
                  pulseGlow();
                }}
                style={[styles.stepBtn, { backgroundColor: colors.primary }]}
                hitSlop={6}
              >
                <Icon name={Icons.add} size={16} color={colors.textInverse} />
              </Pressable>
            </View>
          ) : onAdd || onPress ? (
            <Pressable
              onPress={startAdd}
              style={[styles.addPill, { backgroundColor: colors.primaryMuted }]}
              hitSlop={8}
            >
              <AppText
                variant="caption"
                style={{ color: colors.primary, fontWeight: '700' }}
              >
                {rightLabel}
              </AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>

      <Modal visible={flying} transparent animationType="none">
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.flyCard,
              flyStyle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Icon name={Icons.calories} size={14} color={colors.primary} />
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{ flex: 1, fontWeight: '700' }}
            >
              {flyLabel}
            </AppText>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: 2 },
  addPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 14,
  },
  flyCard: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
