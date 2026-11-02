-- MORROW · Salud: rutinas, registros de entreno, recetas y dietas.
-- Las imágenes (recipes.image, diets.images) son rutas locales del dispositivo; sincronizar los ficheros
-- necesitaría Supabase Storage y no se hace todavía.

create table public.recipes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  servings smallint not null default 1 check (servings > 0),
  prep_min integer,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  image text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index recipes_user_sync_idx on public.recipes (user_id, server_updated_at);
create trigger recipes_touch before insert or update on public.recipes for each row execute function public.touch_server_updated_at();
alter table public.recipes enable row level security;
create policy "recipes: owner reads" on public.recipes for select using (user_id = auth.uid());
create policy "recipes: owner inserts" on public.recipes for insert with check (user_id = auth.uid());
create policy "recipes: owner updates" on public.recipes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recipes: owner deletes" on public.recipes for delete using (user_id = auth.uid());

create table public.routines (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  focus text not null check (focus in ('strength','cardio','mobility','mixed')),
  days jsonb not null default '[]'::jsonb,
  time text,
  duration_min integer not null default 60,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  event_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index routines_user_sync_idx on public.routines (user_id, server_updated_at);
create trigger routines_touch before insert or update on public.routines for each row execute function public.touch_server_updated_at();
alter table public.routines enable row level security;
create policy "routines: owner reads" on public.routines for select using (user_id = auth.uid());
create policy "routines: owner inserts" on public.routines for insert with check (user_id = auth.uid());
create policy "routines: owner updates" on public.routines for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "routines: owner deletes" on public.routines for delete using (user_id = auth.uid());

create table public.workout_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  name text not null,
  date date not null,
  duration_min integer not null,
  exercises jsonb not null default '[]'::jsonb,
  effort smallint check (effort between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index workout_logs_user_sync_idx on public.workout_logs (user_id, server_updated_at);
create trigger workout_logs_touch before insert or update on public.workout_logs for each row execute function public.touch_server_updated_at();
alter table public.workout_logs enable row level security;
create policy "workout_logs: owner reads" on public.workout_logs for select using (user_id = auth.uid());
create policy "workout_logs: owner inserts" on public.workout_logs for insert with check (user_id = auth.uid());
create policy "workout_logs: owner updates" on public.workout_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workout_logs: owner deletes" on public.workout_logs for delete using (user_id = auth.uid());

create table public.diets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  kcal_target integer,
  notes text,
  week jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index diets_user_sync_idx on public.diets (user_id, server_updated_at);
create trigger diets_touch before insert or update on public.diets for each row execute function public.touch_server_updated_at();
alter table public.diets enable row level security;
create policy "diets: owner reads" on public.diets for select using (user_id = auth.uid());
create policy "diets: owner inserts" on public.diets for insert with check (user_id = auth.uid());
create policy "diets: owner updates" on public.diets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "diets: owner deletes" on public.diets for delete using (user_id = auth.uid());
