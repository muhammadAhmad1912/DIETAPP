import React from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/theme/tokens';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({
  children,
  scroll,
  padded = true,
  style,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const content = (
    <View
      style={[
        scroll ? styles.scrollInner : styles.content,
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
  /** Avoid flex:1 inside ScrollView — it blocks scrolling when content is tall. */
  scrollInner: { flexGrow: 0 },
  padded: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  scroll: { paddingBottom: Spacing.xxl + 80, flexGrow: 1 },
});
