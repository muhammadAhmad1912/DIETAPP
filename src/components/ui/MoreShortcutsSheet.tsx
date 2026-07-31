import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons, type AppIconName } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';

export type MoreShortcut = {
  key: string;
  label: string;
  subtitle?: string;
  icon: AppIconName;
  onPress: () => void;
};

interface MoreShortcutsSheetProps {
  visible: boolean;
  onClose: () => void;
  shortcuts: MoreShortcut[];
}

export function MoreShortcutsSheet({
  visible,
  onClose,
  shortcuts,
}: MoreShortcutsSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
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
          <AppText variant="title" style={{ marginBottom: Spacing.xs }}>
            More
          </AppText>
          <AppText muted style={{ marginBottom: Spacing.md }}>
            Shortcuts and settings
          </AppText>

          {shortcuts.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onClose();
                // Let the sheet close animation start before navigating
                requestAnimationFrame(() => item.onPress());
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? colors.primaryMuted
                    : item.key === 'settings'
                      ? colors.cardCalories
                      : colors.surfaceMuted,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor:
                      item.key === 'settings' ? colors.surface : colors.primaryMuted,
                  },
                ]}
              >
                <Icon name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold">{item.label}</AppText>
                {item.subtitle ? (
                  <AppText muted variant="caption">
                    {item.subtitle}
                  </AppText>
                ) : null}
              </View>
              <Icon name={Icons.chevron} size={16} color={colors.tabInactive} />
            </Pressable>
          ))}
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
