import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useMealDraft } from '@/contexts/MealDraftContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lookupBarcode } from '@/services/barcode';
import { localRepo } from '@/services/local/repository';
import { Spacing } from '@/theme/tokens';
import type { Food } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';

const SCAN_COOLDOWN_MS = 2500;

export function BarcodeScannerScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BarcodeScanner'>>();
  const mode = route.params?.mode ?? 'inventory';
  const { user } = useAuth();
  const { upsertFood } = useAppData();
  const { addFromBarcode } = useInventory();
  const { addFood } = useMealDraft();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState('Point at a barcode');
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  if (!permission) {
    return (
      <Screen>
        <AppText>Requesting camera permission…</AppText>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <AppText variant="title">Camera access needed</AppText>
        <AppText muted style={{ marginVertical: Spacing.md }}>
          Allow camera access to scan product barcodes.
        </AppText>
        <Button title="Grant permission" onPress={requestPermission} />
      </Screen>
    );
  }

  const isDuplicateScan = (code: string) => {
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.at < SCAN_COOLDOWN_MS) {
      return true;
    }
    lastScanRef.current = { code, at: now };
    return false;
  };

  const toFood = async (
    data: string,
    product: Awaited<ReturnType<typeof lookupBarcode>>,
  ): Promise<Food | null> => {
    let food = await localRepo.findFoodByBarcode(data);
    if (food) return food;
    if (!product) return null;
    return upsertFood({
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
  };

  const onBarcode = async ({ data }: { data: string }) => {
    if (locked) return;
    if (isDuplicateScan(data)) return;

    setLocked(true);
    setStatus(`Looking up ${data}…`);

    try {
      const product = await lookupBarcode(data);

      if (mode === 'meal' || mode === 'canIEat') {
        const food = await toFood(data, product);
        if (!food) {
          Alert.alert('Not found', 'No product found for this barcode.', [
            {
              text: 'OK',
              onPress: () => {
                setLocked(false);
                setStatus('Point at a barcode');
              },
            },
          ]);
          return;
        }

        if (mode === 'canIEat') {
          navigation.replace('CanIEatThis', {
            foodId: food.id,
            barcode: food.barcode ?? data,
          });
          return;
        }

        addFood(food);
        Alert.alert('Added to meal', `${food.name} was added. Keep scanning or go back.`, [
          {
            text: 'Scan another',
            onPress: () => {
              setLocked(false);
              setStatus('Point at a barcode');
            },
          },
          {
            text: 'Back to meal',
            onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('AddMeal');
            },
          },
        ]);
        return;
      }

      // Inventory mode
      if (!user) {
        Alert.alert('Sign in required', 'Sign in to sync inventory.');
        setLocked(false);
        return;
      }

      if (!product) {
        Alert.alert(
          'Product not found',
          'No Open Food Facts match. Add the item manually?',
          [
            {
              text: 'Add manually',
              onPress: () =>
                navigation.replace('AddInventoryItem', { barcode: data }),
            },
            {
              text: 'Retry',
              onPress: () => {
                setLocked(false);
                setStatus('Point at a barcode');
              },
            },
          ],
        );
        return;
      }

      const item = await addFromBarcode({
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        quantity: 1,
        unit: 'pcs',
        image_url: product.imageUrl,
        calories: product.calories,
        protein_g: product.proteinG,
        carbs_g: product.carbsG,
        fat_g: product.fatG,
        serving_size_g: product.servingSizeG,
        source: product.source,
      });

      // Also keep food catalog in sync for meal logging
      await toFood(data, product);

      Alert.alert('Added to inventory', `${item.name} (${item.quantity} ${item.unit})`, [
        {
          text: 'Scan another',
          onPress: () => {
            setLocked(false);
            setStatus('Point at a barcode');
          },
        },
        {
          text: 'Done',
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('MainTabs');
          },
        },
      ]);
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Could not look up this barcode.',
      );
      setLocked(false);
      setStatus('Point at a barcode');
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={locked ? undefined : onBarcode}
        />
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.frame, { borderColor: colors.primary }]} />
          <AppText style={{ color: '#fff', marginTop: Spacing.md, fontWeight: '600' }}>
            {status}
          </AppText>
          <AppText style={{ color: '#fff', opacity: 0.85, marginTop: 4 }}>
            {mode === 'inventory'
              ? 'Adds to inventory automatically'
              : mode === 'canIEat'
                ? 'Checks against today’s remaining macros'
                : 'Adds to current meal'}
          </AppText>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('MainTabs');
            }}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderRadius: 16,
  },
});
