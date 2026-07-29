# Diet Tracker

Personal diet tracking app built with **Expo SDK 57**, **TypeScript**, **React Navigation**, and **Supabase**.

## Features

- Onboarding (age, height, weight, sex, activity, goal, calorie & macro targets)
- Dashboard (calories, protein, carbs, fat, water)
- Add meals, food search, favorites, recent foods
- Barcode scanner with modular lookup providers (Open Food Facts by default)
- Weight tracker & progress charts
- Daily history
- Local notifications
- Dark / light / system theme
- Deep linking for Quick Add shortcuts (`diettracker://quick-add`)
- AI service stubs prepared for future features (not implemented)

## Architecture

```
src/
  components/     UI, charts, meals, foods, water
  contexts/       Theme + app data (offline-first)
  navigation/     React Navigation stack + tabs + linking
  screens/        Feature screens
  services/
    local/        AsyncStorage repository (source of truth offline)
    supabase/     Client (sync-ready when env configured)
    barcode/      Pluggable barcode providers
    notifications/
    ai/           Future AI surface (stubs only)
    storage/      Cache helpers
  theme/          Design tokens
  types/          Shared models
  utils/          Nutrition + date helpers
supabase/
  schema.sql      Full Postgres schema + RLS
```

Data is **local-first** via AsyncStorage so the app works offline. Point `.env` at Supabase when you are ready to sync.

## Setup

```bash
npm install
cp .env.example .env
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (optional for local-only)
npx expo start
```

Apply the database schema in the Supabase SQL editor:

```bash
# paste contents of supabase/schema.sql
```

## Deep links

| URL | Action |
|-----|--------|
| `diettracker://quick-add` | Opens Quick Add flow |
| `diettracker://quick-add?barcode=...` | Looks up barcode and logs snack |
| `diettracker://add-meal` | Add meal screen |
| `diettracker://food-search` | Food search |
| `diettracker://scan` | Barcode scanner |

## AI (future)

`src/services/ai/index.ts` exports stubs for meal suggestions, image estimation, and coaching. Do not call them in production UI until implemented.
