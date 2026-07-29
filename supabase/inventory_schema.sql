-- AIInventory: auth profiles + per-user inventory
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- App profile (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory items owned by a single user
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  quantity numeric(12, 3) not null default 1 check (quantity >= 0),
  unit text not null default 'pcs',
  category text,
  notes text,
  image_url text,
  calories numeric(10, 2),
  protein_g numeric(10, 2),
  carbs_g numeric(10, 2),
  fat_g numeric(10, 2),
  serving_size_g numeric(10, 2),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_user_idx
  on public.inventory_items (user_id, updated_at desc);

create index if not exists inventory_items_barcode_user_idx
  on public.inventory_items (user_id, barcode)
  where barcode is not null;

create unique index if not exists inventory_items_user_barcode_unique
  on public.inventory_items (user_id, barcode)
  where barcode is not null;

-- Keep updated_at fresh
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

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users manage own inventory" on public.inventory_items;
create policy "Users manage own inventory"
  on public.inventory_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

