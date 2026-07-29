import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from './AppText';
import { Icon, Icons, type AppIconName } from './Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius } from '@/theme/tokens';

interface ProgressRingProps {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  label: string;
  value: string;
  sublabel?: string;
  icon?: AppIconName;
}

export function ProgressRing({
  progress,
  size = 168,
  stroke = 14,
  color,
  label,
  value,
  sublabel,
  icon = Icons.calories,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.center, { backgroundColor: colors.cardCalories }]}>
        <Icon name={icon} size={20} color={color} />
        <AppText variant="label" muted>
          {label}
        </AppText>
        <AppText variant="metric" style={{ color, fontSize: 28 }}>
          {value}
        </AppText>
        {sublabel ? (
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>
            {sublabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    width: '68%',
    height: '68%',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
});
