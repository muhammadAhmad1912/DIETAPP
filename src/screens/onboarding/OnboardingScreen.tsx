import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppData } from '@/contexts/AppDataContext';
import { ACTIVITY_LEVELS, GOAL_OPTIONS } from '@/constants/config';
import { Radius, Spacing } from '@/theme/tokens';
import type { ActivityLevel, GoalType, Sex } from '@/types/models';
import { suggestCalorieGoal, suggestMacros } from '@/utils/nutrition';

const STEPS = [
  'Basics',
  'Body',
  'Lifestyle',
  'Goal',
  'Targets',
] as const;

export function OnboardingScreen() {
  const { colors } = useTheme();
  const { completeOnboarding } = useAppData();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<GoalType>('lose');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const suggested = useMemo(() => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    if (!a || !h || !w) return null;
    const cals = suggestCalorieGoal({
      age: a,
      heightCm: h,
      weightKg: w,
      sex,
      activity,
      goal,
    });
    return { calories: cals, ...suggestMacros(cals) };
  }, [age, height, weight, sex, activity, goal]);

  const ensureTargets = () => {
    if (!suggested) return;
    if (!calories) setCalories(String(suggested.calories));
    if (!protein) setProtein(String(suggested.protein_g));
    if (!carbs) setCarbs(String(suggested.carbs_g));
    if (!fat) setFat(String(suggested.fat_g));
  };

  const next = () => {
    if (step === 3) ensureTargets();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        sex,
        activity_level: activity,
        goal,
        calorie_goal: Number(calories || suggested?.calories),
        protein_g: Number(protein || suggested?.protein_g),
        carbs_g: Number(carbs || suggested?.carbs_g),
        fat_g: Number(fat || suggested?.fat_g),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="label" muted>
        Step {step + 1} of {STEPS.length}
      </AppText>
      <AppText variant="hero" style={{ marginTop: Spacing.xs }}>
        {STEPS[step]}
      </AppText>
      <AppText muted style={{ marginBottom: Spacing.lg }}>
        Personal setup for your daily targets. You can change these later.
      </AppText>

      {step === 0 && (
        <View style={styles.section}>
          <Input
            label="Age"
            placeholder="e.g. 28"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            suffix="years"
          />
          <AppText variant="label" muted>
            Sex
          </AppText>
          <View style={styles.chips}>
            {(['male', 'female', 'other'] as Sex[]).map((s) => (
              <Chip
                key={s}
                label={s}
                selected={sex === s}
                onPress={() => setSex(s)}
                colors={colors}
              />
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={styles.section}>
          <Input
            label="Height"
            placeholder="e.g. 175"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            suffix="cm"
          />
          <Input
            label="Weight"
            placeholder="e.g. 75"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            suffix="kg"
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          {ACTIVITY_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              onPress={() => setActivity(level.value)}
              style={[
                styles.option,
                {
                  borderColor:
                    activity === level.value ? colors.primary : colors.border,
                  backgroundColor:
                    activity === level.value
                      ? colors.primaryMuted
                      : colors.surface,
                },
              ]}
            >
              <AppText variant="bodyBold">{level.label}</AppText>
              <AppText muted variant="caption">
                {level.description}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          {GOAL_OPTIONS.map((g) => (
            <Pressable
              key={g.value}
              onPress={() => setGoal(g.value)}
              style={[
                styles.option,
                {
                  borderColor: goal === g.value ? colors.primary : colors.border,
                  backgroundColor:
                    goal === g.value ? colors.primaryMuted : colors.surface,
                },
              ]}
            >
              <AppText variant="bodyBold">{g.label}</AppText>
              <AppText muted variant="caption">
                {g.description}
              </AppText>
            </Pressable>
          ))}
          {suggested ? (
            <AppText muted style={{ marginTop: Spacing.sm }}>
              Suggested daily target: {suggested.calories} kcal
            </AppText>
          ) : null}
        </View>
      )}

      {step === 4 && (
        <View style={styles.section}>
          <Input
            label="Daily calorie goal"
            placeholder={suggested ? String(suggested.calories) : 'e.g. 2000'}
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            suffix="kcal"
          />
          <Input
            label="Protein"
            placeholder={suggested ? String(suggested.protein_g) : 'e.g. 150'}
            value={protein}
            onChangeText={setProtein}
            keyboardType="number-pad"
            suffix="g"
          />
          <Input
            label="Carbs"
            placeholder={suggested ? String(suggested.carbs_g) : 'e.g. 200'}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="number-pad"
            suffix="g"
          />
          <Input
            label="Fat"
            placeholder={suggested ? String(suggested.fat_g) : 'e.g. 65'}
            value={fat}
            onChangeText={setFat}
            keyboardType="number-pad"
            suffix="g"
          />
          <Button
            title="Use suggested macros"
            variant="ghost"
            onPress={() => {
              if (!suggested) return;
              setCalories(String(suggested.calories));
              setProtein(String(suggested.protein_g));
              setCarbs(String(suggested.carbs_g));
              setFat(String(suggested.fat_g));
            }}
          />
        </View>
      )}

      <View style={styles.footer}>
        {step > 0 ? (
          <Button title="Back" variant="ghost" onPress={back} style={{ flex: 1 }} />
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button title="Continue" onPress={next} style={{ flex: 2 }} />
        ) : (
          <Button
            title="Start tracking"
            onPress={finish}
            loading={loading}
            style={{ flex: 2 }}
          />
        )}
      </View>
    </Screen>
  );
}

function Chip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceMuted,
        },
      ]}
    >
      <AppText
        style={{
          color: selected ? colors.textInverse : colors.text,
          textTransform: 'capitalize',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  option: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
});
