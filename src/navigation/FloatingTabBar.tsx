import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, Icons, type AppIconName } from '@/components/ui/Icon';
import { MealTypeSheet } from '@/components/ui/MealTypeSheet';
import {
  MoreShortcutsSheet,
  type MoreShortcut,
} from '@/components/ui/MoreShortcutsSheet';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import type { MainTabParamList } from '@/types/navigation';
import type { MealType } from '@/types/models';

const TAB_ICONS: Partial<Record<keyof MainTabParamList, AppIconName>> = {
  Dashboard: Icons.dashboard,
  History: Icons.history,
  Progress: Icons.progress,
  Weight: Icons.weight,
  More: Icons.more,
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const parent = navigation.getParent();

  const openMeal = (mealType: MealType) => {
    setMealSheetOpen(false);
    parent?.navigate('AddMeal', { mealType });
  };

  const openScan = () => {
    setMealSheetOpen(false);
    parent?.navigate('BarcodeScanner', { mode: 'meal' });
  };

  const shortcuts: MoreShortcut[] = useMemo(
    () => [
      {
        key: 'favorites',
        label: 'Favorites',
        subtitle: 'Saved foods',
        icon: Icons.star,
        onPress: () => parent?.navigate('Favorites'),
      },
      {
        key: 'weight',
        label: 'Weight tracker',
        subtitle: 'Morning weigh-in',
        icon: Icons.weight,
        onPress: () => navigation.navigate('Weight'),
      },
      {
        key: 'inventory',
        label: 'Inventory',
        subtitle: 'Your food pantry',
        icon: Icons.inventory,
        onPress: () => navigation.navigate('Inventory'),
      },
      {
        key: 'search',
        label: 'Food search',
        subtitle: 'Find foods to log',
        icon: Icons.search,
        onPress: () => parent?.navigate('FoodSearch'),
      },
      {
        key: 'scan',
        label: 'Scan to inventory',
        subtitle: 'Add by barcode',
        icon: Icons.scan,
        onPress: () => parent?.navigate('BarcodeScanner', { mode: 'inventory' }),
      },
      {
        key: 'settings',
        label: 'Settings',
        subtitle: 'Macros, theme, account & sign out',
        icon: Icons.settings,
        onPress: () => parent?.navigate('Settings'),
      },
    ],
    [parent, navigation],
  );

  const visibleRoutes = state.routes.filter(
    (r) => r.name !== 'Inventory' && r.name !== 'Weight',
  );

  const sideTabs = ['Dashboard', 'History', 'Progress', 'More'] as const;
  const routes = visibleRoutes.filter((r) =>
    (sideTabs as readonly string[]).includes(r.name),
  );

  const mid = Math.ceil(routes.length / 2);
  const left = routes.slice(0, mid);
  const right = routes.slice(mid);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused =
      route.name === 'More'
        ? moreSheetOpen
        : !moreSheetOpen && state.index === index;
    const { options } = descriptors[route.key];
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.title ?? route.name;
    const color = focused ? colors.primary : colors.tabInactive;
    const iconName =
      TAB_ICONS[route.name as keyof MainTabParamList] ?? Icons.dashboard;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => {
          if (route.name === 'More') {
            setMoreSheetOpen(true);
            return;
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}
      >
        <Icon name={iconName} size={focused ? 24 : 22} color={color} />
        <AppText
          variant="caption"
          style={{
            color,
            fontWeight: focused ? '800' : '600',
            fontSize: 10,
            marginTop: 2,
          }}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        <View
          style={[
            styles.bar,
            {
              backgroundColor: colors.tabBar,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : colors.primary,
            },
          ]}
        >
          <View style={styles.side}>{left.map(renderTab)}</View>

          <View style={styles.fabSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add meal"
              onPress={() => setMealSheetOpen(true)}
              style={({ pressed }) => [
                styles.fab,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Icon name={Icons.add} size={30} color={colors.textInverse} />
            </Pressable>
            <AppText
              variant="caption"
              style={{
                color: colors.primary,
                fontWeight: '800',
                fontSize: 10,
                marginTop: 4,
              }}
            >
              Add Meal
            </AppText>
          </View>

          <View style={styles.side}>{right.map(renderTab)}</View>
        </View>
      </View>

      <MealTypeSheet
        visible={mealSheetOpen}
        onClose={() => setMealSheetOpen(false)}
        onSelectMeal={openMeal}
        onScanBarcode={openScan}
      />

      <MoreShortcutsSheet
        visible={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 68,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fabSlot: {
    width: 78,
    alignItems: 'center',
    marginTop: -28,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
