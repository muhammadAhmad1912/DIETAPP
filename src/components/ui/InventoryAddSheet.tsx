import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';

interface InventoryAddSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddManual: () => void;
  onScanBarcode: () => void;
}

export function InventoryAddSheet({
  visible,
  onClose,
  onAddManual,
  onScanBarcode,
}: InventoryAddSheetProps) {
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
            Add to inventory
          </AppText>
          <AppText muted style={{ marginBottom: Spacing.md }}>
            Add food manually or scan a barcode
          </AppText>

          <Pressable
            onPress={onAddManual}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? colors.primaryMuted
                  : colors.cardCalories,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Icon name={Icons.add} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold">Add food manually</AppText>
              <AppText muted variant="caption">
                Name, macros, quantity
              </AppText>
            </View>
          </Pressable>

          <Pressable
            onPress={onScanBarcode}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? colors.primaryMuted
                  : colors.surfaceMuted,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Icon name={Icons.scan} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold">Add food by barcode</AppText>
              <AppText muted variant="caption">
                Scan and save nutrition automatically
              </AppText>
            </View>
          </Pressable>
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
