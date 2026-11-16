-- Council tax style: 10 monthly instalments (April–January).
alter table public.commitments drop constraint if exists commitments_frequency_check;
alter table public.commitments add constraint commitments_frequency_check
  check (frequency in ('weekly','fortnightly','four_weekly','monthly','ten_monthly','quarterly','six_monthly','annually','one_off'));
