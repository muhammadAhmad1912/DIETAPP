import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/** Placeholder tab — More opens a sheet from the tab bar instead. */
export function MorePlaceholderScreen() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
