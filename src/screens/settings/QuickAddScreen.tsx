import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAppData } from '@/contexts/AppDataContext';
import { lookupBarcode } from '@/services/barcode';
import { localRepo } from '@/services/local/repository';
import { useTheme } from '@/contexts/ThemeContext';
import type { RootStackParamList } from '@/types/navigation';

/**
 * Deep-link target for future Quick Add shortcuts.
 * Supports diettracker://quick-add?foodId=... or ?barcode=...
 */
export function QuickAddScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuickAdd'>>();
  const { upsertFood, addMeal } = useAppData();
  const [message, setMessage] = useState('Adding…');

  useEffect(() => {
    void (async () => {
      try {
        const { foodId, barcode } = route.params ?? {};
        let food = foodId
          ? (await localRepo.getFoods()).find((f) => f.id === foodId) ?? null
          : null;

        if (!food && barcode) {
          food = await localRepo.findFoodByBarcode(barcode);
          if (!food) {
            const product = await lookupBarcode(barcode);
            if (product) {
              food = await upsertFood({
                name: product.name,
                brand: product.brand,
                barcode: product.barcode,
                serving_size_g: product.servingSizeG,
                calories: product.calories,
                protein_g: product.proteinG,
                carbs_g: product.carbsG,
                fat_g: product.fatG,
                fiber_g: product.fiberG,
                source: 'open_food_facts',
              });
            }
          }
        }

        if (!food) {
          setMessage('Nothing to add. Opening food search…');
          navigation.replace('FoodSearch');
          return;
        }

        await addMeal({
          name: food.name,
          meal_type: 'snack',
          items: [
            {
              food_id: food.id,
              food_name: food.name,
              servings: 1,
              serving_size_g: food.serving_size_g,
              calories: food.calories,
              protein_g: food.protein_g,
              carbs_g: food.carbs_g,
              fat_g: food.fat_g,
            },
          ],
        });
        navigation.replace('MainTabs');
      } catch {
        setMessage('Quick add failed');
        navigation.replace('AddMeal');
      }
    })();
  }, [route.params, addMeal, upsertFood, navigation]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
        <AppText muted style={{ marginTop: 12 }}>
          {message}
        </AppText>
      </View>
    </Screen>
  );
}
