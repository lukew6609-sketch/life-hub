-- Split bills into household / personal / rental property.
alter table public.commitments add column bill_group text not null default 'household'
  check (bill_group in ('household','personal','rental'));
