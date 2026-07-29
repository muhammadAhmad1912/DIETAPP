import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/theme/tokens';

type Variant = keyof typeof Typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const typography = Typography[variant] as TextStyle;

  return (
    <Text
      style={[
        typography,
        { color: color ?? (muted ? colors.textSecondary : colors.text) },
        style,
      ]}
      {...rest}
    />
  );
}

export const textStyles = StyleSheet.create({});
