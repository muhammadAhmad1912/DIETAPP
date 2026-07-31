import type { Food, Goals } from '@/types/models';
import { scaleByGrams, round1 } from '@/utils/nutrition';

export type MacroKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g';

export type RemainingBudgets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MacroOver = {
  key: MacroKey;
  label: string;
  overBy: number;
  unit: string;
};

export type CanIEatResult = {
  portion: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size_g: number;
    servings: number;
  };
  remainingBefore: RemainingBudgets;
  remainingAfter: RemainingBudgets;
  /** True when every remaining-after value is still ≥ 0. */
  fits: boolean;
  overs: MacroOver[];
  advice: string[];
};

const LABELS: Record<MacroKey, { label: string; unit: string }> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein_g: { label: 'Protein', unit: 'g' },
  carbs_g: { label: 'Carbs', unit: 'g' },
  fat_g: { label: 'Fat', unit: 'g' },
};

export function remainingBudgets(
  today: RemainingBudgets,
  goals: Pick<Goals, 'calorie_goal' | 'protein_g' | 'carbs_g' | 'fat_g'>,
): RemainingBudgets {
  return {
    calories: round1(goals.calorie_goal - today.calories),
    protein_g: round1(goals.protein_g - today.protein_g),
    carbs_g: round1(goals.carbs_g - today.carbs_g),
    fat_g: round1(goals.fat_g - today.fat_g),
  };
}

export function evaluateCanIEat(params: {
  food: Food;
  grams: number;
  today: RemainingBudgets;
  goals: Pick<Goals, 'calorie_goal' | 'protein_g' | 'carbs_g' | 'fat_g'>;
}): CanIEatResult {
  const grams = Math.max(0, params.grams);
  const portion = scaleByGrams(params.food, grams);
  const remainingBefore = remainingBudgets(params.today, params.goals);
  const remainingAfter: RemainingBudgets = {
    calories: round1(remainingBefore.calories - portion.calories),
    protein_g: round1(remainingBefore.protein_g - portion.protein_g),
    carbs_g: round1(remainingBefore.carbs_g - portion.carbs_g),
    fat_g: round1(remainingBefore.fat_g - portion.fat_g),
  };

  const overs: MacroOver[] = [];
  (Object.keys(LABELS) as MacroKey[]).forEach((key) => {
    const after = remainingAfter[key];
    if (after < 0) {
      overs.push({
        key,
        label: LABELS[key].label,
        overBy: round1(Math.abs(after)),
        unit: LABELS[key].unit,
      });
    }
  });

  return {
    portion,
    remainingBefore,
    remainingAfter,
    fits: overs.length === 0,
    overs,
    advice: buildAdvice(overs, remainingBefore, portion),
  };
}

function buildAdvice(
  overs: MacroOver[],
  before: RemainingBudgets,
  portion: CanIEatResult['portion'],
): string[] {
  if (overs.length === 0) {
    const lines = [
      'This fits your remaining budget for today.',
      `After eating: ${Math.max(0, round1(before.calories - portion.calories))} kcal left.`,
    ];
    if (before.protein_g - portion.protein_g < 15 && before.protein_g > 0) {
      lines.push('Protein will be nearly used up — prioritize lean options later.');
    }
    return lines;
  }

  const lines: string[] = [
    'This would put you over your daily goal. If you eat it, balance later:',
  ];

  for (const over of overs) {
    if (over.key === 'calories') {
      lines.push(
        `Cut about ${Math.round(over.overBy)} kcal from a later meal (e.g. smaller dinner or skip a snack).`,
      );
    } else if (over.key === 'protein_g') {
      lines.push(
        `You're over protein by ${over.overBy}g — choose lower-protein sides later.`,
      );
    } else if (over.key === 'carbs_g') {
      lines.push(
        `Over carbs by ${over.overBy}g — reduce rice, bread, or sweets later.`,
      );
    } else if (over.key === 'fat_g') {
      lines.push(
        `Over fat by ${over.overBy}g — go lighter on oils, cheese, and fried food later.`,
      );
    }
  }

  const calOver = overs.find((o) => o.key === 'calories');
  if (calOver && calOver.overBy >= 100) {
    lines.push(
      'Tip: a shorter walk or skipping dessert can offset part of the surplus.',
    );
  }

  return lines.slice(0, 5);
}
