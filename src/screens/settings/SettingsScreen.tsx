import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '@/services/notifications/notifications';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { aiService } from '@/services/ai';
import { Spacing, Radius } from '@/theme/tokens';
import type { NotificationSettings, ThemePreference } from '@/types/models';

export function SettingsScreen() {
  const { colors, preference, setPreference, isDark } = useTheme();
  const { profile, goals, updateGoals, updateWaterGoal } = useAppData();
  const { user, signOut } = useAuth();
  const { sync, syncing, items } = useInventory();
  const [notifications, setNotifications] =
    useState<NotificationSettings | null>(null);
  const [calorieGoal, setCalorieGoal] = useState(
    goals ? String(goals.calorie_goal) : '',
  );
  const [proteinGoal, setProteinGoal] = useState(
    goals ? String(goals.protein_g) : '',
  );
  const [carbsGoal, setCarbsGoal] = useState(
    goals ? String(goals.carbs_g) : '',
  );
  const [fatGoal, setFatGoal] = useState(goals ? String(goals.fat_g) : '');
  const [waterGoal, setWaterGoal] = useState(
    profile ? String(profile.water_goal_ml) : '',
  );

  useEffect(() => {
    void getNotificationSettings().then(setNotifications);
  }, []);

  useEffect(() => {
    if (!goals) return;
    setCalorieGoal(String(goals.calorie_goal));
    setProteinGoal(String(goals.protein_g));
    setCarbsGoal(String(goals.carbs_g));
    setFatGoal(String(goals.fat_g));
  }, [goals]);

  useEffect(() => {
    if (!profile) return;
    setWaterGoal(String(profile.water_goal_ml));
  }, [profile]);

  const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];

  return (
    <Screen scroll>
      <AppText variant="title">Settings</AppText>
      <AppText muted style={{ marginBottom: Spacing.sm }}>
        Goals, appearance, and account
      </AppText>

      <Card style={styles.card}>
        <AppText variant="subtitle">Account</AppText>
        <AppText muted>{user?.email ?? 'Not signed in'}</AppText>
        <AppText muted variant="caption">
          {items.length} inventory items synced to Supabase
        </AppText>
        {profile ? (
          <AppText muted variant="caption">
            Profile: {profile.age}y · {profile.height_cm}cm · {profile.weight_kg}
            kg · {profile.goal}
          </AppText>
        ) : null}
        <Button
          title={syncing ? 'Syncing…' : 'Sync inventory now'}
          variant="secondary"
          loading={syncing}
          onPress={() => void sync()}
        />
        <Button
          title="Sign out"
          variant="danger"
          onPress={() => {
            Alert.alert('Sign out?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                  const error = await signOut();
                  if (error) Alert.alert('Error', error);
                },
              },
            ]);
          }}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Appearance</AppText>
        <View style={styles.chips}>
          {themeOptions.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => void setPreference(opt)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    preference === opt ? colors.primary : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                style={{
                  color:
                    preference === opt ? colors.textInverse : colors.text,
                  textTransform: 'capitalize',
                }}
              >
                {opt}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText muted variant="caption">
          Currently using {isDark ? 'dark' : 'light'} palette
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Goals</AppText>
        <Input
          label="Daily calories"
          placeholder="e.g. 2000"
          value={calorieGoal}
          onChangeText={setCalorieGoal}
          keyboardType="number-pad"
          suffix="kcal"
          tint={colors.cardCalories}
        />
        <Input
          label="Protein"
          placeholder="e.g. 150"
          value={proteinGoal}
          onChangeText={setProteinGoal}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardProtein}
        />
        <Input
          label="Carbs"
          placeholder="e.g. 200"
          value={carbsGoal}
          onChangeText={setCarbsGoal}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardCarbs}
        />
        <Input
          label="Fat"
          placeholder="e.g. 65"
          value={fatGoal}
          onChangeText={setFatGoal}
          keyboardType="decimal-pad"
          suffix="g"
          tint={colors.cardFat}
        />
        <Input
          label="Water"
          placeholder="e.g. 2500"
          value={waterGoal}
          onChangeText={setWaterGoal}
          keyboardType="number-pad"
          suffix="ml"
          tint={colors.cardWater}
        />
        <Button
          title="Save goals"
          variant="secondary"
          onPress={() => {
            const calories = Number(calorieGoal);
            const protein = Number(proteinGoal);
            const carbs = Number(carbsGoal);
            const fat = Number(fatGoal);
            const water = Number(waterGoal);
            if (!calories || protein < 0 || carbs < 0 || fat < 0 || !water) {
              Alert.alert(
                'Invalid goals',
                'Enter valid calorie, macro, and water values.',
              );
              return;
            }
            void updateGoals({
              calorie_goal: calories,
              protein_g: protein,
              carbs_g: carbs,
              fat_g: fat,
            });
            void updateWaterGoal(water);
            Alert.alert('Saved', 'Your nutrition goals were updated.');
          }}
          style={{ marginTop: Spacing.sm }}
        />
      </Card>

      {notifications ? (
        <Card style={styles.card}>
          <AppText variant="subtitle">Notifications</AppText>
          <Row
            label="Enable reminders"
            value={notifications.enabled}
            onChange={(v) => {
              const next = { ...notifications, enabled: v };
              setNotifications(next);
              void saveNotificationSettings(next);
            }}
          />
          <Row
            label="Meal reminders"
            value={notifications.mealReminders}
            onChange={(v) => {
              const next = { ...notifications, mealReminders: v };
              setNotifications(next);
              void saveNotificationSettings(next);
            }}
          />
          <Row
            label="Water reminders"
            value={notifications.waterReminders}
            onChange={(v) => {
              const next = { ...notifications, waterReminders: v };
              setNotifications(next);
              void saveNotificationSettings(next);
            }}
          />
          <Row
            label="Morning weigh-in reminders"
            value={notifications.weighInReminders}
            onChange={(v) => {
              const next = { ...notifications, weighInReminders: v };
              setNotifications(next);
              void saveNotificationSettings(next);
            }}
          />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <AppText variant="subtitle">Integrations</AppText>
        <AppText muted>
          Supabase:{' '}
          {isSupabaseConfigured
            ? 'connected via EXPO_PUBLIC_* env'
            : 'missing .env keys'}
        </AppText>
        <AppText muted>
          AI features: {aiService.status.replace('_', ' ')}
        </AppText>
      </Card>
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <AppText>{label}</AppText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md, gap: Spacing.sm },
  chips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
