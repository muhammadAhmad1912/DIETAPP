import { subDays } from 'date-fns';
import { localRepo } from '@/services/local/repository';
import type { Goals } from '@/types/models';
import { toDateKey } from '@/utils/dates';

export type AnalyticsPeriod = 'week' | 'month';

export type DayTotals = {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  mealCount: number;
};

export type TopFood = {
  name: string;
  times: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type PeriodInsights = {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  daysLogged: number;
  averages: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  /** Averages across logged days only (ignores empty days). */
  averagesOnLoggedDays: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  series: DayTotals[];
  topFoods: TopFood[];
  currentStreak: number;
  consistencyScore: number;
  daysOnTarget: number;
  bullets: string[];
};

function dateKeysForPeriod(period: AnalyticsPeriod, end = new Date()): string[] {
  const days = period === 'week' ? 7 : 30;
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(toDateKey(subDays(end, i)));
  }
  return keys;
}

function isOnTarget(calories: number, goal: number | undefined): boolean {
  if (!goal || goal <= 0 || calories <= 0) return false;
  const ratio = calories / goal;
  return ratio >= 0.8 && ratio <= 1.2;
}

/** Consecutive days with ≥1 meal, ending at the most recent logged day (incl. today). */
export async function computeCurrentStreak(): Promise<number> {
  const meals = await localRepo.getMeals();
  if (!meals.length) return 0;

  const logged = new Set(meals.map((m) => toDateKey(m.logged_at)));
  let streak = 0;
  let cursor = new Date();

  // If nothing logged today, start from yesterday (streak still active until day ends)
  if (!logged.has(toDateKey(cursor))) {
    cursor = subDays(cursor, 1);
  }

  while (logged.has(toDateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
    if (streak > 400) break;
  }
  return streak;
}

export async function getPeriodInsights(
  period: AnalyticsPeriod,
  goals: Goals | null,
): Promise<PeriodInsights> {
  const keys = dateKeysForPeriod(period);
  const endDate = keys[keys.length - 1]!;
  const startDate = keys[0]!;

  const series: DayTotals[] = [];
  for (const date of keys) {
    const totals = await localRepo.getDailyTotals(date);
    series.push({
      date,
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      mealCount: totals.meals.length,
    });
  }

  const daysInPeriod = keys.length;
  const loggedDays = series.filter((d) => d.mealCount > 0);
  const daysLogged = loggedDays.length;
  const daysOnTarget = series.filter((d) =>
    isOnTarget(d.calories, goals?.calorie_goal),
  ).length;

  const sum = (fn: (d: DayTotals) => number, rows: DayTotals[]) =>
    rows.reduce((s, d) => s + fn(d), 0);

  const averages = {
    calories: daysInPeriod ? sum((d) => d.calories, series) / daysInPeriod : 0,
    protein_g: daysInPeriod ? sum((d) => d.protein_g, series) / daysInPeriod : 0,
    carbs_g: daysInPeriod ? sum((d) => d.carbs_g, series) / daysInPeriod : 0,
    fat_g: daysInPeriod ? sum((d) => d.fat_g, series) / daysInPeriod : 0,
  };

  const averagesOnLoggedDays = {
    calories: daysLogged ? sum((d) => d.calories, loggedDays) / daysLogged : 0,
    protein_g: daysLogged ? sum((d) => d.protein_g, loggedDays) / daysLogged : 0,
    carbs_g: daysLogged ? sum((d) => d.carbs_g, loggedDays) / daysLogged : 0,
    fat_g: daysLogged ? sum((d) => d.fat_g, loggedDays) / daysLogged : 0,
  };

  // Consistency: 70% logging habit + 30% staying near calorie goal
  const logRate = daysInPeriod ? daysLogged / daysInPeriod : 0;
  const targetRate = daysInPeriod ? daysOnTarget / daysInPeriod : 0;
  const consistencyScore = Math.round(logRate * 70 + targetRate * 30);

  const topFoods = await getTopFoods(startDate, endDate, 5);
  const currentStreak = await computeCurrentStreak();

  const bullets = buildBullets({
    period,
    averagesOnLoggedDays,
    averages,
    daysLogged,
    daysInPeriod,
    daysOnTarget,
    consistencyScore,
    currentStreak,
    topFoods,
    goals,
  });

  return {
    period,
    startDate,
    endDate,
    daysInPeriod,
    daysLogged,
    averages,
    averagesOnLoggedDays,
    series,
    topFoods,
    currentStreak,
    consistencyScore,
    daysOnTarget,
    bullets,
  };
}

async function getTopFoods(
  startDate: string,
  endDate: string,
  limit: number,
): Promise<TopFood[]> {
  const meals = await localRepo.getMeals();
  const items = await localRepo.getMealItems();
  const mealById = new Map(meals.map((m) => [m.id, m]));

  const map = new Map<string, TopFood>();

  for (const item of items) {
    const meal = mealById.get(item.meal_id);
    if (!meal) continue;
    const day = toDateKey(meal.logged_at);
    if (day < startDate || day > endDate) continue;

    const key = item.food_name.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.times += 1;
      existing.calories += item.calories;
      existing.protein_g += item.protein_g;
      existing.carbs_g += item.carbs_g;
      existing.fat_g += item.fat_g;
    } else {
      map.set(key, {
        name: item.food_name,
        times: 1,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.times - a.times || b.calories - a.calories)
    .slice(0, limit);
}

function buildBullets(input: {
  period: AnalyticsPeriod;
  averagesOnLoggedDays: PeriodInsights['averagesOnLoggedDays'];
  averages: PeriodInsights['averages'];
  daysLogged: number;
  daysInPeriod: number;
  daysOnTarget: number;
  consistencyScore: number;
  currentStreak: number;
  topFoods: TopFood[];
  goals: Goals | null;
}): string[] {
  const label = input.period === 'week' ? 'this week' : 'this month';
  const bullets: string[] = [];

  if (input.daysLogged === 0) {
    bullets.push(`No meals logged ${label} yet. Start tracking to unlock insights.`);
    return bullets;
  }

  bullets.push(
    `You logged ${input.daysLogged} of ${input.daysInPeriod} days ${label}.`,
  );

  bullets.push(
    `Avg ${Math.round(input.averagesOnLoggedDays.calories)} kcal on days you ate` +
      (input.goals
        ? ` (goal ${input.goals.calorie_goal}).`
        : '.'),
  );

  if (input.goals) {
    const avgP = input.averagesOnLoggedDays.protein_g;
    const pct = Math.round((avgP / Math.max(input.goals.protein_g, 1)) * 100);
    bullets.push(
      `Protein averaged ${Math.round(avgP)}g (${pct}% of your ${Math.round(input.goals.protein_g)}g goal).`,
    );
  }

  if (input.currentStreak > 0) {
    bullets.push(
      input.currentStreak === 1
        ? 'Current streak: 1 day — keep it going!'
        : `Current streak: ${input.currentStreak} days in a row.`,
    );
  }

  if (input.topFoods[0]) {
    bullets.push(
      `Most eaten: ${input.topFoods[0].name} (${input.topFoods[0].times}×).`,
    );
  }

  if (input.consistencyScore >= 80) {
    bullets.push('Consistency looks strong — great habit building.');
  } else if (input.consistencyScore >= 50) {
    bullets.push('Solid progress. Logging a bit more often will boost your score.');
  } else {
    bullets.push('Tip: log at least one meal daily to raise your consistency score.');
  }

  return bullets.slice(0, 5);
}
