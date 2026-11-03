-- morrow · Recompensas: algo que la persona quiere comprarse y el libro de movimientos con el que se lo gana.
-- El crédito no es dinero real. Los importes van en céntimos.

-- Las tareas diarias son hábitos con un valor.
alter table public.habits add column value integer check (value is null or value >= 0);  -- céntimos por cada vez; null = valor por defecto
alter table public.habits add column preset_key text;                                       -- viene del catálogo de tareas básicas

create table public.rewards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  price bigint not null check (price > 0),
  image text,                       -- ruta local del dispositivo (no se sincroniza el fichero)
  url text,
  notes text,
  "order" integer not null default 0,
  status text not null default 'active' check (status in ('active','redeemed')),
  redeemed_at timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index rewards_user_sync_idx on public.rewards (user_id, server_updated_at);
create trigger rewards_touch before insert or update on public.rewards for each row execute function public.touch_server_updated_at();
alter table public.rewards enable row level security;
create policy "rewards: owner reads" on public.rewards for select using (user_id = auth.uid());
create policy "rewards: owner inserts" on public.rewards for insert with check (user_id = auth.uid());
create policy "rewards: owner updates" on public.rewards for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rewards: owner deletes" on public.rewards for delete using (user_id = auth.uid());

-- Libro de movimientos. Las ganancias se concilian en el dispositivo a partir de lo hecho
-- (clave estable por origen, p. ej. "habit:<id>:2026-11-03"); los canjes son importes negativos.
-- No hay unicidad por clave: dos dispositivos pueden crear la misma y la app se queda con la más antigua.
create table public.reward_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  source text not null check (source in ('habit','task','workout','meal','review','bonus','redeem')),
  date date not null,
  amount bigint not null check (amount <> 0),
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index reward_entries_user_sync_idx on public.reward_entries (user_id, server_updated_at);
create index reward_entries_user_key_idx on public.reward_entries (user_id, key);
create trigger reward_entries_touch before insert or update on public.reward_entries for each row execute function public.touch_server_updated_at();
alter table public.reward_entries enable row level security;
create policy "reward_entries: owner reads" on public.reward_entries for select using (user_id = auth.uid());
create policy "reward_entries: owner inserts" on public.reward_entries for insert with check (user_id = auth.uid());
create policy "reward_entries: owner updates" on public.reward_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reward_entries: owner deletes" on public.reward_entries for delete using (user_id = auth.uid());
