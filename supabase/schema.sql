-- Diet Tracker Supabase schema
-- Single-user personal diet tracker with auth.users linkage for future multi-device sync

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type sex_type as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_level_type as enum (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_type as enum ('lose', 'maintain', 'gain');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type food_source_type as enum ('local', 'open_food_facts', 'custom', 'ai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type theme_preference_type as enum ('system', 'light', 'dark');
exception when duplicate_object then null; end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  age integer not null check (age > 0 and age < 130),
  height_cm numeric(5, 2) not null check (height_cm > 0),
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  sex sex_type not null,
  activity_level activity_level_type not null,
  goal goal_type not null,
  onboarding_completed boolean not null default false,
  theme_preference theme_preference_type not null default 'system',
  water_goal_ml integer not null default 2500 check (water_goal_ml > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Goals (supports historical goal changes)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  calorie_goal integer not null check (calorie_goal > 0),
  protein_g numeric(6, 1) not null check (protein_g >= 0),
  carbs_g numeric(6, 1) not null check (carbs_g >= 0),
  fat_g numeric(6, 1) not null check (fat_g >= 0),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_profile_effective_idx
  on public.goals (profile_id, effective_from desc);

-- Foods (catalog + user custom foods)
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  serving_size_g numeric(8, 2) not null check (serving_size_g > 0),
  calories numeric(8, 1) not null check (calories >= 0),
  protein_g numeric(8, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(8, 2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(8, 2) not null default 0 check (fat_g >= 0),
  fiber_g numeric(8, 2),
  source food_source_type not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists foods_barcode_unique_idx
  on public.foods (barcode)
  where barcode is not null;

create index if not exists foods_name_idx on public.foods (lower(name));
create index if not exists foods_owner_idx on public.foods (owner_id);

-- Favorite foods
create table if not exists public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, food_id)
);

-- Recent foods (usage tracking)
create table if not exists public.recent_foods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1,
  unique (profile_id, food_id)
);

create index if not exists recent_foods_profile_used_idx
  on public.recent_foods (profile_id, last_used_at desc);

-- Meals
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  meal_type meal_type not null,
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_profile_logged_idx
  on public.meals (profile_id, logged_at desc);

-- Meal items
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null,
  servings numeric(8, 2) not null default 1 check (servings > 0),
  serving_size_g numeric(8, 2) not null check (serving_size_g > 0),
  calories numeric(8, 1) not null check (calories >= 0),
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meal_items_meal_idx on public.meal_items (meal_id);

-- Weight logs
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_profile_logged_idx
  on public.weight_logs (profile_id, logged_at desc);

-- Water logs
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_profile_logged_idx
  on public.water_logs (profile_id, logged_at desc);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists foods_set_updated_at on public.foods;
create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.foods enable row level security;
alter table public.favorite_foods enable row level security;
alter table public.recent_foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.weight_logs enable row level security;
alter table public.water_logs enable row level security;

-- Profiles policies
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Goals policies
create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Foods: public catalog (owner_id null) readable by all; custom foods private
create policy "Anyone can read catalog foods"
  on public.foods for select
  using (owner_id is null or auth.uid() = owner_id);

create policy "Users insert own foods"
  on public.foods for insert
  with check (auth.uid() = owner_id);

create policy "Users update own foods"
  on public.foods for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users delete own foods"
  on public.foods for delete
  using (auth.uid() = owner_id);

-- Favorites / recent
create policy "Users manage own favorites"
  on public.favorite_foods for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users manage own recent foods"
  on public.recent_foods for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Meals
create policy "Users manage own meals"
  on public.meals for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users manage own meal items"
  on public.meal_items for all
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.profile_id = auth.uid()
    )
  );

-- Weight / water
create policy "Users manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users manage own water logs"
  on public.water_logs for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
