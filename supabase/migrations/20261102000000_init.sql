-- MORROW schema. Every row belongs to one user; Row Level Security isolates users.
-- Money is stored in integer cents. Local-first sync: ids are generated on device (uuid),
-- server_updated_at (trigger) drives incremental pulls, deleted_at makes deletes syncable.

create or replace function public.touch_server_updated_at() returns trigger language plpgsql as $$
begin new.server_updated_at = now(); return new; end $$;

create table public.financial_goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  target bigint not null check (target >= 0),
  current bigint not null default 0,
  due_date date,
  priority smallint not null default 2 check (priority between 1 and 3),
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index financial_goals_user_sync_idx on public.financial_goals (user_id, server_updated_at);
create trigger financial_goals_touch before insert or update on public.financial_goals for each row execute function public.touch_server_updated_at();
alter table public.financial_goals enable row level security;
create policy "financial_goals: owner reads" on public.financial_goals for select using (user_id = auth.uid());
create policy "financial_goals: owner inserts" on public.financial_goals for insert with check (user_id = auth.uid());
create policy "financial_goals: owner updates" on public.financial_goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "financial_goals: owner deletes" on public.financial_goals for delete using (user_id = auth.uid());

create table public.personal_goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  dimension text not null,
  horizon text not null check (horizon in ('short','medium','long')),
  start_date date not null,
  target_date date,
  priority smallint not null default 2 check (priority between 1 and 3),
  status text not null default 'active' check (status in ('active','paused','done')),
  milestones jsonb not null default '[]'::jsonb,  -- GoalMilestone[] (owned value objects)
  financial_goal_id uuid references public.financial_goals(id) on delete set null,
  manual_progress smallint default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index personal_goals_user_sync_idx on public.personal_goals (user_id, server_updated_at);
create trigger personal_goals_touch before insert or update on public.personal_goals for each row execute function public.touch_server_updated_at();
alter table public.personal_goals enable row level security;
create policy "personal_goals: owner reads" on public.personal_goals for select using (user_id = auth.uid());
create policy "personal_goals: owner inserts" on public.personal_goals for insert with check (user_id = auth.uid());
create policy "personal_goals: owner updates" on public.personal_goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "personal_goals: owner deletes" on public.personal_goals for delete using (user_id = auth.uid());

create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount bigint not null check (amount >= 0),
  cycle text not null check (cycle in ('monthly','yearly')),
  next_date date not null,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index subscriptions_user_sync_idx on public.subscriptions (user_id, server_updated_at);
create trigger subscriptions_touch before insert or update on public.subscriptions for each row execute function public.touch_server_updated_at();
alter table public.subscriptions enable row level security;
create policy "subscriptions: owner reads" on public.subscriptions for select using (user_id = auth.uid());
create policy "subscriptions: owner inserts" on public.subscriptions for insert with check (user_id = auth.uid());
create policy "subscriptions: owner updates" on public.subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subscriptions: owner deletes" on public.subscriptions for delete using (user_id = auth.uid());

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  category text not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  due date,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  subtasks jsonb not null default '[]'::jsonb,
  recurrence text not null default 'none',
  goal_id uuid references public.personal_goals(id) on delete set null,
  milestone_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index tasks_user_sync_idx on public.tasks (user_id, server_updated_at);
create trigger tasks_touch before insert or update on public.tasks for each row execute function public.touch_server_updated_at();
alter table public.tasks enable row level security;
create policy "tasks: owner reads" on public.tasks for select using (user_id = auth.uid());
create policy "tasks: owner inserts" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks: owner updates" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks: owner deletes" on public.tasks for delete using (user_id = auth.uid());

create table public.events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  "start" text not null,  -- local datetime YYYY-MM-DDTHH:mm
  "end" text not null,
  all_day boolean not null default false,
  location text,
  notes text,
  recurrence text not null default 'none',
  reminder_minutes integer,
  goal_id uuid references public.personal_goals(id) on delete set null,
  exceptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index events_user_sync_idx on public.events (user_id, server_updated_at);
create trigger events_touch before insert or update on public.events for each row execute function public.touch_server_updated_at();
alter table public.events enable row level security;
create policy "events: owner reads" on public.events for select using (user_id = auth.uid());
create policy "events: owner inserts" on public.events for insert with check (user_id = auth.uid());
create policy "events: owner updates" on public.events for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "events: owner deletes" on public.events for delete using (user_id = auth.uid());

create table public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  slot text not null check (slot in ('morning','evening','anytime')),
  dimension text not null,
  days jsonb not null default '[]'::jsonb,
  log jsonb not null default '[]'::jsonb,  -- YYYY-MM-DD done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index habits_user_sync_idx on public.habits (user_id, server_updated_at);
create trigger habits_touch before insert or update on public.habits for each row execute function public.touch_server_updated_at();
alter table public.habits enable row level security;
create policy "habits: owner reads" on public.habits for select using (user_id = auth.uid());
create policy "habits: owner inserts" on public.habits for insert with check (user_id = auth.uid());
create policy "habits: owner updates" on public.habits for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habits: owner deletes" on public.habits for delete using (user_id = auth.uid());

create table public.leisure_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  kind text not null,
  date date,
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index leisure_items_user_sync_idx on public.leisure_items (user_id, server_updated_at);
create trigger leisure_items_touch before insert or update on public.leisure_items for each row execute function public.touch_server_updated_at();
alter table public.leisure_items enable row level security;
create policy "leisure_items: owner reads" on public.leisure_items for select using (user_id = auth.uid());
create policy "leisure_items: owner inserts" on public.leisure_items for insert with check (user_id = auth.uid());
create policy "leisure_items: owner updates" on public.leisure_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leisure_items: owner deletes" on public.leisure_items for delete using (user_id = auth.uid());

create table public.ideas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index ideas_user_sync_idx on public.ideas (user_id, server_updated_at);
create trigger ideas_touch before insert or update on public.ideas for each row execute function public.touch_server_updated_at();
alter table public.ideas enable row level security;
create policy "ideas: owner reads" on public.ideas for select using (user_id = auth.uid());
create policy "ideas: owner inserts" on public.ideas for insert with check (user_id = auth.uid());
create policy "ideas: owner updates" on public.ideas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ideas: owner deletes" on public.ideas for delete using (user_id = auth.uid());

create table public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),  -- cents
  type text not null check (type in ('income','expense')),
  category text not null,
  date date not null,
  description text not null default '',
  account text,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index transactions_user_sync_idx on public.transactions (user_id, server_updated_at);
create trigger transactions_touch before insert or update on public.transactions for each row execute function public.touch_server_updated_at();
alter table public.transactions enable row level security;
create policy "transactions: owner reads" on public.transactions for select using (user_id = auth.uid());
create policy "transactions: owner inserts" on public.transactions for insert with check (user_id = auth.uid());
create policy "transactions: owner updates" on public.transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions: owner deletes" on public.transactions for delete using (user_id = auth.uid());

create table public.budgets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit bigint not null check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index budgets_user_sync_idx on public.budgets (user_id, server_updated_at);
create trigger budgets_touch before insert or update on public.budgets for each row execute function public.touch_server_updated_at();
alter table public.budgets enable row level security;
create policy "budgets: owner reads" on public.budgets for select using (user_id = auth.uid());
create policy "budgets: owner inserts" on public.budgets for insert with check (user_id = auth.uid());
create policy "budgets: owner updates" on public.budgets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets: owner deletes" on public.budgets for delete using (user_id = auth.uid());

create table public.assistant_conversations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);
create index assistant_conversations_user_sync_idx on public.assistant_conversations (user_id, server_updated_at);
create trigger assistant_conversations_touch before insert or update on public.assistant_conversations for each row execute function public.touch_server_updated_at();
alter table public.assistant_conversations enable row level security;
create policy "assistant_conversations: owner reads" on public.assistant_conversations for select using (user_id = auth.uid());
create policy "assistant_conversations: owner inserts" on public.assistant_conversations for insert with check (user_id = auth.uid());
create policy "assistant_conversations: owner updates" on public.assistant_conversations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assistant_conversations: owner deletes" on public.assistant_conversations for delete using (user_id = auth.uid());

-- Settings-shaped data (small, one row or a few rows per user)
create table public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  finance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.life_balance_dimensions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null check (key in ('career','finance','health','relationships','growth','leisure','home','purpose')),
  label text,
  priority smallint not null default 2 check (priority between 1 and 3),
  enabled boolean not null default true,
  self_score numeric(4,1) check (self_score between 0 and 12),  -- LifeBalanceScores: the person's own rating
  rated_at timestamptz,
  primary key (user_id, key)
);
create table public.life_balance_snapshots (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  taken_at timestamptz not null,
  values jsonb not null,  -- { key: { self, data, combined } }
  primary key (user_id, month)
);
create table public.weekly_reviews (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  data jsonb not null,
  primary key (user_id, week_start)
);
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  text text not null,
  proposals jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
create policy "user_preferences: owner all" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.life_balance_dimensions enable row level security;
create policy "life_balance_dimensions: owner all" on public.life_balance_dimensions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.life_balance_snapshots enable row level security;
create policy "life_balance_snapshots: owner all" on public.life_balance_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.weekly_reviews enable row level security;
create policy "weekly_reviews: owner all" on public.weekly_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.assistant_messages enable row level security;
create policy "assistant_messages: owner all" on public.assistant_messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
