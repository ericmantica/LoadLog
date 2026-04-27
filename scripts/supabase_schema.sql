-- LoadLog Supabase schema and RLS policies
-- Run this in Supabase SQL Editor before using the app end-to-end.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null unique,
  display_name text not null,
  fitness_level text not null check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  available_days_per_week integer not null check (available_days_per_week between 1 and 7),
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists username text;
update public.users
set username = lower(split_part(email, '@', 1))
where username is null;
alter table public.users alter column username set not null;
create unique index if not exists idx_users_username on public.users (username);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('active', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans (id) on delete cascade,
  day_number integer not null check (day_number between 1 and 7),
  muscle_group text not null,
  status text not null check (status in ('scheduled', 'completed', 'partial', 'missed')),
  scheduled_date date not null
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days (id) on delete cascade,
  name text not null,
  target_sets integer not null check (target_sets > 0),
  target_reps integer not null check (target_reps > 0),
  current_weight numeric not null check (current_weight >= 0),
  progression_step numeric not null check (progression_step > 0)
);

create table if not exists public.logged_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  set_number integer not null check (set_number > 0),
  reps_completed integer not null check (reps_completed >= 0),
  weight_used numeric not null check (weight_used >= 0),
  completed boolean not null default false,
  logged_at timestamptz not null default now()
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_workout_date date
);

create index if not exists idx_weekly_plans_user_id on public.weekly_plans (user_id);
create index if not exists idx_workout_days_plan_id on public.workout_days (plan_id);
create index if not exists idx_exercises_workout_day_id on public.exercises (workout_day_id);
create index if not exists idx_logged_sets_exercise_id on public.logged_sets (exercise_id);
create index if not exists idx_streaks_user_id on public.streaks (user_id);

alter table public.users enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercises enable row level security;
alter table public.logged_sets enable row level security;
alter table public.streaks enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists weekly_plans_select_own on public.weekly_plans;
create policy weekly_plans_select_own on public.weekly_plans
for select using (auth.uid() = user_id);

drop policy if exists weekly_plans_insert_own on public.weekly_plans;
create policy weekly_plans_insert_own on public.weekly_plans
for insert with check (auth.uid() = user_id);

drop policy if exists weekly_plans_update_own on public.weekly_plans;
create policy weekly_plans_update_own on public.weekly_plans
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists weekly_plans_delete_own on public.weekly_plans;
create policy weekly_plans_delete_own on public.weekly_plans
for delete using (auth.uid() = user_id);

drop policy if exists workout_days_select_own on public.workout_days;
create policy workout_days_select_own on public.workout_days
for select using (
  exists (
    select 1
    from public.weekly_plans wp
    where wp.id = workout_days.plan_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists workout_days_insert_own on public.workout_days;
create policy workout_days_insert_own on public.workout_days
for insert with check (
  exists (
    select 1
    from public.weekly_plans wp
    where wp.id = workout_days.plan_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists workout_days_update_own on public.workout_days;
create policy workout_days_update_own on public.workout_days
for update using (
  exists (
    select 1
    from public.weekly_plans wp
    where wp.id = workout_days.plan_id
      and wp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.weekly_plans wp
    where wp.id = workout_days.plan_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists workout_days_delete_own on public.workout_days;
create policy workout_days_delete_own on public.workout_days
for delete using (
  exists (
    select 1
    from public.weekly_plans wp
    where wp.id = workout_days.plan_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists exercises_select_own on public.exercises;
create policy exercises_select_own on public.exercises
for select using (
  exists (
    select 1
    from public.workout_days wd
    join public.weekly_plans wp on wp.id = wd.plan_id
    where wd.id = exercises.workout_day_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own on public.exercises
for insert with check (
  exists (
    select 1
    from public.workout_days wd
    join public.weekly_plans wp on wp.id = wd.plan_id
    where wd.id = exercises.workout_day_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
for update using (
  exists (
    select 1
    from public.workout_days wd
    join public.weekly_plans wp on wp.id = wd.plan_id
    where wd.id = exercises.workout_day_id
      and wp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_days wd
    join public.weekly_plans wp on wp.id = wd.plan_id
    where wd.id = exercises.workout_day_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own on public.exercises
for delete using (
  exists (
    select 1
    from public.workout_days wd
    join public.weekly_plans wp on wp.id = wd.plan_id
    where wd.id = exercises.workout_day_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists logged_sets_select_own on public.logged_sets;
create policy logged_sets_select_own on public.logged_sets
for select using (
  exists (
    select 1
    from public.exercises e
    join public.workout_days wd on wd.id = e.workout_day_id
    join public.weekly_plans wp on wp.id = wd.plan_id
    where e.id = logged_sets.exercise_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists logged_sets_insert_own on public.logged_sets;
create policy logged_sets_insert_own on public.logged_sets
for insert with check (
  exists (
    select 1
    from public.exercises e
    join public.workout_days wd on wd.id = e.workout_day_id
    join public.weekly_plans wp on wp.id = wd.plan_id
    where e.id = logged_sets.exercise_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists logged_sets_update_own on public.logged_sets;
create policy logged_sets_update_own on public.logged_sets
for update using (
  exists (
    select 1
    from public.exercises e
    join public.workout_days wd on wd.id = e.workout_day_id
    join public.weekly_plans wp on wp.id = wd.plan_id
    where e.id = logged_sets.exercise_id
      and wp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.exercises e
    join public.workout_days wd on wd.id = e.workout_day_id
    join public.weekly_plans wp on wp.id = wd.plan_id
    where e.id = logged_sets.exercise_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists logged_sets_delete_own on public.logged_sets;
create policy logged_sets_delete_own on public.logged_sets
for delete using (
  exists (
    select 1
    from public.exercises e
    join public.workout_days wd on wd.id = e.workout_day_id
    join public.weekly_plans wp on wp.id = wd.plan_id
    where e.id = logged_sets.exercise_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists streaks_select_own on public.streaks;
create policy streaks_select_own on public.streaks
for select using (auth.uid() = user_id);

drop policy if exists streaks_insert_own on public.streaks;
create policy streaks_insert_own on public.streaks
for insert with check (auth.uid() = user_id);

drop policy if exists streaks_update_own on public.streaks;
create policy streaks_update_own on public.streaks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists streaks_delete_own on public.streaks;
create policy streaks_delete_own on public.streaks
for delete using (auth.uid() = user_id);
