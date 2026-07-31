import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from 'date-fns';
import type { WeightLog } from '@/types/models';
import { toDateKey } from '@/utils/dates';

export type WeightPoint = { date: string; value: number };

export type WeightTrendDirection = 'down' | 'up' | 'stable';

export interface WeightTrend {
  direction: WeightTrendDirection;
  /** Estimated kg change per week from recent logs. */
  weeklyRateKg: number;
  /** Net change across the series window (latest − earliest). */
  changeKg: number;
  daysSpanned: number;
  currentKg: number;
  /** Linear projection ~7 days after the latest log. */
  predictedNextWeekKg: number;
  forecastDate: string;
  label: string;
  detail: string;
  sampleSize: number;
}

/** One weight per calendar day (latest log wins), oldest → newest. */
export function buildWeightSeries(
  logs: WeightLog[],
  limit = 20,
): WeightPoint[] {
  const byDay = new Map<string, number>();
  for (const w of [...logs].reverse()) {
    byDay.set(toDateKey(w.logged_at), w.weight_kg);
  }
  return [...byDay.entries()]
    .map(([date, value]) => ({ date, value }))
    .slice(-limit);
}

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) {
    return { slope: 0, intercept: sumY / n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function formatRate(kgPerWeek: number): string {
  const abs = Math.abs(kgPerWeek);
  return `${abs.toFixed(1)} kg/week`;
}

/**
 * Trend + next-week prediction from daily weight points.
 * Needs at least 2 distinct days.
 */
export function analyzeWeightTrend(series: WeightPoint[]): WeightTrend | null {
  if (series.length < 2) return null;

  const first = parseISO(series[0].date);
  const last = parseISO(series[series.length - 1].date);
  const xs = series.map((p) =>
    differenceInCalendarDays(parseISO(p.date), first),
  );
  const ys = series.map((p) => p.value);
  const { slope } = linearRegression(xs, ys);

  const weeklyRateKg = Math.round(slope * 7 * 100) / 100;
  const currentKg = series[series.length - 1].value;
  const changeKg =
    Math.round((currentKg - series[0].value) * 100) / 100;
  const daysSpanned = Math.max(
    1,
    differenceInCalendarDays(last, first),
  );
  const predictedNextWeekKg =
    Math.round((currentKg + slope * 7) * 100) / 100;
  const forecastDate = toDateKey(addDays(last, 7));

  const stable = Math.abs(weeklyRateKg) < 0.05;
  const direction: WeightTrendDirection = stable
    ? 'stable'
    : weeklyRateKg < 0
      ? 'down'
      : 'up';

  const sinceLabel = format(first, 'MMM d');
  let label: string;
  let detail: string;
  if (direction === 'stable') {
    label = 'Holding steady';
    detail = `Around ${currentKg.toFixed(1)} kg over the last ${daysSpanned} days`;
  } else if (direction === 'down') {
    label = `Losing ${formatRate(weeklyRateKg)}`;
    detail = `${changeKg.toFixed(1)} kg since ${sinceLabel}`;
  } else {
    label = `Gaining ${formatRate(weeklyRateKg)}`;
    detail = `+${Math.abs(changeKg).toFixed(1)} kg since ${sinceLabel}`;
  }

  return {
    direction,
    weeklyRateKg,
    changeKg,
    daysSpanned,
    currentKg,
    predictedNextWeekKg,
    forecastDate,
    label,
    detail,
    sampleSize: series.length,
  };
}

export const DUPLICATE_WEIGHT_TODAY =
  "You've already logged your weight today. Come back tomorrow for your next check-in.";
