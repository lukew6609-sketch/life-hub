-- Money in: wages, rent and other income, with history. Owner-only RLS (same pattern as 0001).
create table public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source text,
  category text not null default 'other',
  amount numeric(12,2),
  frequency text not null default 'monthly'
    check (frequency in ('weekly','fortnightly','four_weekly','monthly','quarterly','six_monthly','annually','one_off')),
  payment_day int check (payment_day between 1 and 31),
  start_date date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.income_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  income_id uuid not null references public.income(id) on delete cascade,
  effective_date date not null default current_date,
  amount numeric(12,2) not null,
  frequency text not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.income (user_id);
create index on public.income_history (user_id);
create index on public.income_history (income_id);
do $$
declare t text;
begin
  foreach t in array array['income','income_history']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;
