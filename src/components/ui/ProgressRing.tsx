import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  size = 180,
  stroke = 12,
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
  const pct = Math.round(clamped * 100);
  const showProgress = clamped > 0.001;
  const centerSize = size * 0.7;

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
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.65" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primaryMuted}
          strokeWidth={stroke}
          fill="none"
          opacity={0.9}
        />
        {showProgress ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGrad)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View
        style={[
          styles.center,
          {
            width: centerSize,
            height: centerSize,
            borderRadius: centerSize / 2,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={[styles.iconBubble, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={icon} size={16} color={color} />
        </View>
        <AppText variant="label" muted>
          {label}
        </AppText>
        <AppText variant="metric" style={{ color, fontSize: 30, lineHeight: 34 }}>
          {value}
        </AppText>
        <AppText
          variant="caption"
          style={{ color, fontWeight: '800', marginTop: 2 }}
        >
          {pct}%
        </AppText>
        {sublabel ? (
          <AppText
            variant="caption"
            muted
            style={{ textAlign: 'center', marginTop: 2 }}
          >
            {sublabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
