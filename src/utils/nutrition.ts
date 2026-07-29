import type { ActivityLevel, GoalType, Sex } from '@/types/models';
import { ACTIVITY_LEVELS, GOAL_OPTIONS } from '@/constants/config';

/** Mifflin-St Jeor BMR */
export function calculateBmr(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, age, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  const level = ACTIVITY_LEVELS.find((a) => a.value === activity);
  return Math.round(bmr * (level?.multiplier ?? 1.2));
}

export function suggestCalorieGoal(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: GoalType;
}): number {
  const bmr = calculateBmr(params);
  const tdee = calculateTdee(bmr, params.activity);
  const offset =
    GOAL_OPTIONS.find((g) => g.value === params.goal)?.calorieOffset ?? 0;
  return Math.max(1200, Math.round(tdee + offset));
}

/** Default macros: protein 30%, carbs 40%, fat 30% of calories */
export function suggestMacros(calorieGoal: number): {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  return {
    protein_g: Math.round((calorieGoal * 0.3) / 4),
    carbs_g: Math.round((calorieGoal * 0.4) / 4),
    fat_g: Math.round((calorieGoal * 0.3) / 9),
  };
}

export function scaleNutrition(
  base: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size_g: number;
  },
  servings: number,
) {
  return scaleByGrams(base, base.serving_size_g * servings);
}

/**
 * Scale nutrients by grams eaten.
 * `base` macros are defined for `base.serving_size_g` (one serving).
 */
export function scaleByGrams(
  base: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size_g: number;
  },
  grams: number,
) {
  const serving = base.serving_size_g > 0 ? base.serving_size_g : 100;
  const factor = grams / serving;
  return {
    calories: round1(base.calories * factor),
    protein_g: round1(base.protein_g * factor),
    carbs_g: round1(base.carbs_g * factor),
    fat_g: round1(base.fat_g * factor),
    serving_size_g: round1(grams),
    servings: round1(factor),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function progressRatio(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, current / goal));
}
