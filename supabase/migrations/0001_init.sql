-- life-hub schema. Every table is private to the signed-in user via RLS.

create extension if not exists pgcrypto;

-- ---------- Bills, subscriptions, insurance, direct debits ----------
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  provider text,
  category text not null default 'other',
  amount numeric(12,2),
  frequency text not null default 'monthly'
    check (frequency in ('weekly','fortnightly','four_weekly','monthly','quarterly','six_monthly','annually','one_off')),
  payment_day int check (payment_day between 1 and 31),
  payment_method text,
  start_date date,
  end_date date,
  auto_renews boolean not null default true,
  reference text,
  website text,
  phone text,
  notes text,
  active boolean not null default true,
  vehicle_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  effective_date date not null default current_date,
  amount numeric(12,2) not null,
  frequency text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Cars ----------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  registration text not null,
  make text,
  model text,
  year int,
  colour text,
  mot_due date,
  tax_due date,
  service_due date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.commitments
  add constraint commitments_vehicle_fk foreign key (vehicle_id) references public.vehicles(id) on delete set null;

-- ---------- Warranties ----------
create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item text not null,
  brand text,
  retailer text,
  purchase_date date,
  expiry_date date,
  cost numeric(12,2),
  serial_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Gas & electric ----------
create table public.energy_tariffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplier text not null,
  tariff_name text,
  fuel text not null default 'electricity' check (fuel in ('electricity','gas')),
  tariff_type text,
  unit_rate_p numeric(10,4),
  night_rate_p numeric(10,4),
  standing_charge_p numeric(10,4),
  start_date date,
  end_date date,
  exit_fee numeric(10,2),
  monthly_payment numeric(10,2),
  annual_usage_kwh numeric(12,1),
  meter_number text,
  mpan_mprn text,
  account_number text,
  is_current boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Documents (files live in the private 'documents' storage bucket) ----------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  status text not null default 'processing' check (status in ('processing','ready','error')),
  error text,
  doc_type text,
  provider text,
  reference text,
  start_date date,
  end_date date,
  amount numeric(12,2),
  amount_frequency text,
  summary text,
  key_facts jsonb not null default '[]'::jsonb,
  energy jsonb,
  extracted_text text,
  commitment_id uuid references public.commitments(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  warranty_id uuid references public.warranties(id) on delete set null,
  search tsvector generated always as (
    to_tsvector('english',
      coalesce(title,'') || ' ' || coalesce(provider,'') || ' ' || coalesce(reference,'') || ' ' ||
      coalesce(doc_type,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(left(extracted_text, 200000),''))
  ) stored,
  created_at timestamptz not null default now()
);
create index documents_search_idx on public.documents using gin (search);

-- ---------- Lent / borrowed items ----------
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item text not null,
  person text not null,
  direction text not null default 'lent' check (direction in ('lent','borrowed')),
  date_out date not null default current_date,
  expected_back date,
  returned_on date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Other important dates (passport, licence, boiler service...) ----------
create table public.key_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text,
  due_date date not null,
  repeat_months int,
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Settings ----------
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  alert_days int not null default 45,
  calendar_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------- Indexes on foreign keys / owners ----------
create index on public.commitments (user_id);
create index on public.commitments (vehicle_id);
create index on public.price_history (commitment_id);
create index on public.price_history (user_id);
create index on public.vehicles (user_id);
create index on public.warranties (user_id);
create index on public.energy_tariffs (user_id);
create index on public.documents (user_id);
create index on public.documents (commitment_id);
create index on public.documents (vehicle_id);
create index on public.documents (warranty_id);
create index on public.loans (user_id);
create index on public.key_dates (user_id);

-- ---------- Row level security: owner only ----------
do $$
declare t text;
begin
  foreach t in array array['commitments','price_history','vehicles','warranties','energy_tariffs','documents','loans','key_dates','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "owner_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;

-- ---------- Private storage bucket: files stored under <user_id>/... ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do nothing;

create policy "docs_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "docs_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "docs_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "docs_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- Lock sign-ups: first account is the owner; others only if allow-listed ----------
create table public.allowed_signups (email text primary key);
alter table public.allowed_signups enable row level security;
-- (no policies: only reachable from the SQL editor / dashboard)

create or replace function public.guard_signups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users)
     and not exists (select 1 from public.allowed_signups a where lower(a.email) = lower(new.email)) then
    raise exception 'Sign-ups are closed for this app';
  end if;
  return new;
end $$;

create trigger guard_signups before insert on auth.users
  for each row execute function public.guard_signups();

-- ---------- Calendar feed (subscribe from Google/Apple Calendar) ----------
create or replace function public.calendar_events(p_token uuid)
returns table (uid text, title text, event_date date, details text)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (select s.user_id from public.settings s where s.calendar_token = p_token)
  select 'c-' || c.id, c.name || ' renews/ends', c.end_date,
         coalesce(c.provider, '') || coalesce(' · ref ' || c.reference, '') || coalesce(' · £' || c.amount::text, '')
    from public.commitments c join u on u.user_id = c.user_id
   where c.active and c.end_date is not null
  union all
  select 'mot-' || v.id, 'MOT due: ' || v.registration, v.mot_due, coalesce(v.make,'') || ' ' || coalesce(v.model,'')
    from public.vehicles v join u on u.user_id = v.user_id where v.mot_due is not null
  union all
  select 'tax-' || v.id, 'Car tax due: ' || v.registration, v.tax_due, coalesce(v.make,'') || ' ' || coalesce(v.model,'')
    from public.vehicles v join u on u.user_id = v.user_id where v.tax_due is not null
  union all
  select 'svc-' || v.id, 'Service due: ' || v.registration, v.service_due, ''
    from public.vehicles v join u on u.user_id = v.user_id where v.service_due is not null
  union all
  select 'w-' || w.id, 'Warranty ends: ' || w.item, w.expiry_date, coalesce(w.retailer,'')
    from public.warranties w join u on u.user_id = w.user_id where w.expiry_date is not null
  union all
  select 'e-' || e.id, initcap(e.fuel) || ' tariff ends: ' || e.supplier, e.end_date, coalesce(e.tariff_name,'')
    from public.energy_tariffs e join u on u.user_id = e.user_id where e.is_current and e.end_date is not null
  union all
  select 'k-' || k.id, k.title, k.due_date, coalesce(k.notes,'')
    from public.key_dates k join u on u.user_id = k.user_id where not k.done
$$;

revoke all on function public.calendar_events(uuid) from public;
grant execute on function public.calendar_events(uuid) to anon, authenticated;
revoke all on function public.guard_signups() from public, anon, authenticated;
