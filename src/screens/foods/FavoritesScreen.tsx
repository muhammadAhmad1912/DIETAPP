import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, Icons } from '@/components/ui/Icon';
import { FoodListItem } from '@/components/foods/FoodListItem';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/theme/tokens';
import type { RootStackParamList } from '@/types/navigation';

export function FavoritesScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, toggleFavoriteFood } = useAppData();

  const sorted = useMemo(
    () =>
      [...favorites].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [favorites],
  );

  const browseFavorites = () =>
    navigation.navigate('FoodSearch', { mode: 'favorites' });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <AppText variant="title">Favorites</AppText>
          <AppText muted>
            {sorted.length} saved food{sorted.length === 1 ? '' : 's'}
          </AppText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={Icons.star} size={16} color={colors.primary} />
          <AppText style={{ color: colors.primary, fontWeight: '800' }}>
            {sorted.length}
          </AppText>
        </View>
      </View>

      <Button
        title="Browse foods to favorite"
        variant="secondary"
        onPress={browseFavorites}
        style={{ marginBottom: Spacing.md }}
      />

      {sorted.length === 0 ? (
        <Card tint={colors.cardCalories} style={styles.empty}>
          <Icon name={Icons.starOutline} size={36} color={colors.primary} />
          <AppText variant="bodyBold" style={{ marginTop: Spacing.sm }}>
            No favorites yet
          </AppText>
          <AppText muted style={{ textAlign: 'center', marginVertical: Spacing.sm }}>
            Browse foods and tap the star to save them here. Nothing is added to
            a meal from this screen.
          </AppText>
        </Card>
      ) : (
        <>
          <AppText muted style={{ marginBottom: Spacing.sm }}>
            Tap the star to remove a favorite.
          </AppText>
          {sorted.map((food) => (
            <FoodListItem
              key={food.id}
              food={{ ...food, is_favorite: true }}
              onToggleFavorite={() => void toggleFavoriteFood(food)}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
