import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Icon, Icons } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import {
  addManualGroceryItems,
  clearCheckedGroceryItems,
  formatGroceryAmount,
  generateGroceryList,
  getGroceryList,
  groceryProgress,
  removeGroceryItem,
  toggleGroceryItem,
} from '@/services/grocery/groceryList';
import { Radius, Spacing } from '@/theme/tokens';
import type { GroceryItem, GroceryList } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';

type DraftRow = { key: string; name: string };

let draftKey = 0;
function nextDraftKey() {
  draftKey += 1;
  return `draft-${draftKey}`;
}

function emptyDraftRows(): DraftRow[] {
  return [{ key: nextDraftKey(), name: '' }];
}

export function GroceryListScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroceryList'>>();
  const [list, setList] = useState<GroceryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>(emptyDraftRows);

  const regenerate = useCallback(async (preserveChecked = true) => {
    setGenerating(true);
    try {
      const next = await generateGroceryList({ preserveChecked });
      setList(next);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (route.params?.regenerate) {
        navigation.setParams({ regenerate: undefined });
        await regenerate(true);
        return;
      }
      const existing = await getGroceryList();
      setList(existing);
    } finally {
      setLoading(false);
    }
  }, [route.params?.regenerate, navigation, regenerate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const progress = useMemo(() => groceryProgress(list), [list]);

  const sortedItems = useMemo(() => {
    if (!list) return [];
    return [...list.items].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [list]);

  const onToggle = async (item: GroceryItem) => {
    const next = await toggleGroceryItem(item.id);
    if (next) setList(next);
  };

  const onClearChecked = async () => {
    const next = await clearCheckedGroceryItems();
    if (next) setList(next);
  };

  const filledCount = drafts.filter((d) => d.name.trim()).length;

  const updateDraft = (key: string, name: string) => {
    setDrafts((prev) => {
      const next = prev.map((row) =>
        row.key === key ? { ...row, name } : row,
      );
      // Drop extra blank rows, then keep exactly one empty row at the end
      while (
        next.length > 1 &&
        !next[next.length - 1].name.trim() &&
        !next[next.length - 2].name.trim()
      ) {
        next.pop();
      }
      if (next[next.length - 1]?.name.trim()) {
        next.push({ key: nextDraftKey(), name: '' });
      }
      return next;
    });
  };

  const openComposer = () => {
    setDrafts(emptyDraftRows());
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDrafts(emptyDraftRows());
  };

  const onAdd = async () => {
    const entries = drafts
      .map((d) => d.name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (entries.length === 0) return;
    setAdding(true);
    try {
      const next = await addManualGroceryItems(entries);
      setList(next);
      closeComposer();
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (item: GroceryItem) => {
    const next = await removeGroceryItem(item.id);
    if (next) setList(next);
  };

  const rangeLabel =
    list != null
      ? `${format(parseISO(list.range_start), 'MMM d')} – ${format(parseISO(list.range_end), 'MMM d')}`
      : null;

  const listHeader = (
    <View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Grocery list</AppText>
          <AppText muted>
            {list
              ? `From meal plans · ${rangeLabel}`
              : 'Built from your meal planner'}
          </AppText>
        </View>
        <View style={[styles.cartBadge, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={Icons.grocery} size={22} color={colors.primary} />
        </View>
      </View>

      {list && list.items.length > 0 ? (
        <Card tint={colors.cardCalories} style={styles.progressCard}>
          <AppText variant="bodyBold" style={{ color: colors.primary }}>
            {progress.checked}/{progress.total} checked
          </AppText>
          <AppText muted variant="caption">
            {progress.remaining === 0
              ? 'All done — nice shopping!'
              : `${progress.remaining} left to get`}
          </AppText>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress.total ? (progress.checked / progress.total) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </Card>
      ) : null}

      {composerOpen ? (
        <Card tint={colors.surface} style={styles.addCard}>
          <View style={styles.composerHead}>
            <AppText variant="subtitle">Add your own</AppText>
            <Pressable onPress={closeComposer} hitSlop={10}>
              <Icon name={Icons.close} size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <AppText muted variant="caption" style={{ marginBottom: Spacing.sm }}>
            Type a name — the next row appears when you start the last one.
          </AppText>
          <View style={{ gap: Spacing.sm }}>
            {drafts.map((row, index) => (
              <Input
                key={row.key}
                placeholder={
                  index === 0 ? 'e.g. Olive oil' : `Item ${index + 1}`
                }
                value={row.name}
                onChangeText={(text) => updateDraft(row.key, text)}
                returnKeyType="next"
                autoFocus={index === 0}
              />
            ))}
            <Button
              title={
                filledCount > 1
                  ? `Add ${filledCount} items`
                  : filledCount === 1
                    ? 'Add 1 item'
                    : 'Add items'
              }
              onPress={() => void onAdd()}
              loading={adding}
              disabled={filledCount === 0}
            />
          </View>
        </Card>
      ) : (
        <Button
          title="Add your own items"
          onPress={openComposer}
          style={styles.addCard}
        />
      )}

      <View style={styles.actions}>
        <Button
          title={list ? 'Refresh from planner' : 'Generate from planner'}
          variant="secondary"
          onPress={() => void regenerate(true)}
          loading={generating}
          style={{ flex: 1 }}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !list || list.items.length === 0 ? (
        <Card tint={colors.cardCalories} style={styles.empty}>
          <Icon name={Icons.grocery} size={32} color={colors.primary} />
          <AppText variant="bodyBold">No groceries yet</AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            Generate from your meal planner, or tap Add your own items to start
            a list.
          </AppText>
          <Button
            title="Open meal planner"
            variant="secondary"
            onPress={() => navigation.navigate('MealPlanner')}
            style={{ marginTop: Spacing.sm, alignSelf: 'stretch' }}
          />
        </Card>
      ) : (
        <View style={styles.listHead}>
          <AppText variant="subtitle">{progress.remaining} to buy</AppText>
          {progress.checked > 0 ? (
            <Pressable onPress={() => void onClearChecked()} hitSlop={8}>
              <AppText style={{ color: colors.primary, fontWeight: '700' }}>
                Uncheck all
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={loading || !list || list.items.length === 0 ? [] : sortedItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void onToggle(item)}
            style={[
              styles.row,
              {
                backgroundColor: item.checked
                  ? colors.surfaceMuted
                  : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon
              name={item.checked ? Icons.check : Icons.checkOutline}
              size={26}
              color={item.checked ? colors.primary : colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyBold"
                numberOfLines={1}
                style={
                  item.checked
                    ? {
                        textDecorationLine: 'line-through',
                        color: colors.textSecondary,
                      }
                    : undefined
                }
              >
                {item.name}
              </AppText>
              <AppText muted variant="caption">
                {formatGroceryAmount(item)}
                {!item.manual && item.source_count > 1
                  ? ` · combined from ${item.source_count} meals`
                  : ''}
              </AppText>
            </View>
            {item.manual ? (
              <Pressable
                onPress={() => void onRemove(item)}
                hitSlop={10}
                accessibilityLabel="Remove item"
              >
                <Icon name={Icons.close} size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cartBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    marginBottom: Spacing.md,
    gap: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  addCard: {
    marginBottom: Spacing.md,
  },
  composerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
});
