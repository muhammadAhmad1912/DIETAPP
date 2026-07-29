import { format, isToday, isYesterday, parseISO, startOfDay } from 'date-fns';

export function toDateKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function startOfDayIso(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(d).toISOString();
}

export function friendlyDateLabel(dateKey: string): string {
  const d = parseISO(dateKey);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function formatCalories(n: number): string {
  return Math.round(n).toLocaleString();
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
