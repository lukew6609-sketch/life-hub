-- Life cover: what each life / critical illness / income protection policy pays out.
create table public.protection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  commitment_id uuid references public.commitments(id) on delete set null,
  name text not null,
  insurer text,
  policy_number text,
  cover_type text not null default 'life'
    check (cover_type in ('life','critical_illness','life_and_ci','income_protection','mortgage_protection','family_income','other')),
  people_covered text,
  life_cover numeric(14,2),
  ci_cover numeric(14,2),
  monthly_benefit numeric(12,2),
  cover_basis text,
  start_date date,
  end_date date,
  premium numeric(12,2),
  premium_frequency text default 'monthly',
  in_trust boolean,
  beneficiaries text,
  claims_phone text,
  status text not null default 'active' check (status in ('active','claimed','ended')),
  details jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.protection (user_id);
create index on public.protection (commitment_id);
alter table public.protection enable row level security;
create policy "owner_select" on public.protection for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_insert" on public.protection for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner_update" on public.protection for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_delete" on public.protection for delete to authenticated using ((select auth.uid()) = user_id);

-- What the AI pulled out of a life/CI policy document, kept with the document.
alter table public.documents add column protection jsonb;
