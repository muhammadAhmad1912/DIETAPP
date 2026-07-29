import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

export type AppIconName = keyof typeof Ionicons.glyphMap;

export const Icons = {
  calories: 'flame' as AppIconName,
  protein: 'barbell' as AppIconName,
  carbs: 'leaf' as AppIconName,
  fat: 'nutrition' as AppIconName,
  water: 'water' as AppIconName,
  meals: 'restaurant' as AppIconName,
  dashboard: 'home' as AppIconName,
  history: 'calendar' as AppIconName,
  progress: 'stats-chart' as AppIconName,
  weight: 'fitness' as AppIconName,
  inventory: 'cube' as AppIconName,
  more: 'ellipsis-horizontal' as AppIconName,
  add: 'add' as AppIconName,
  scan: 'barcode' as AppIconName,
  search: 'search' as AppIconName,
  star: 'star' as AppIconName,
  starOutline: 'star-outline' as AppIconName,
  breakfast: 'sunny' as AppIconName,
  lunch: 'partly-sunny' as AppIconName,
  dinner: 'moon' as AppIconName,
  snack: 'cafe' as AppIconName,
  check: 'checkmark-circle' as AppIconName,
  close: 'close' as AppIconName,
  remove: 'remove' as AppIconName,
  edit: 'create-outline' as AppIconName,
  trash: 'trash-outline' as AppIconName,
} as const;

interface IconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.primary} />;
}
