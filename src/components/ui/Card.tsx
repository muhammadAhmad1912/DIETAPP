import React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';

interface CardProps extends ViewProps {
  tint?: string;
  elevated?: boolean;
}

export function Card({ style, tint, elevated = true, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#0F1F18',
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
});
