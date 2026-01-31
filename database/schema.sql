-- Enable UUID
create extension if not exists "pgcrypto";

-- 1) Profiles (linked to Supabase Auth users)
-- 1) Profiles (linked to Supabase Auth users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'barber', 'admin')) default 'client',
  full_name text not null,
  phone text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Services (managed by barber/admin)
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_min int not null check (duration_min > 0),
  price_cents int not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Barber Availability Rules (weekly schedule)
create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  created_at timestamptz not null default now()
);

-- 4) Time Off Blocks
create table if not exists time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references profiles(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  check (end_datetime > start_datetime),
  reason text,
  created_at timestamptz not null default now()
);

-- 5) Bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  barber_id uuid references profiles(id) on delete cascade, -- Made nullable for initial booking request
  service_id uuid not null references services(id),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  check (end_datetime > start_datetime),
  status text not null check (status in ('requested','accepted','declined','countered','cancelled','completed','confirmed','arrived','no_show')) default 'requested',

  notes text,

  -- counter-offer fields (only used if barber proposes new time)
  counter_start_datetime timestamptz,
  counter_end_datetime timestamptz,

  -- Payment fields
  payment_type text not null check (payment_type in ('cash','deposit','full')) default 'cash',
  paid_amount_cents int not null default 0,
  check (paid_amount_cents >= 0),
  
  -- Legacy / Consolidated Payment fields (from migrations)
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  payment_intent_id text,
  payment_status text default 'pending' check (payment_status in ('pending','authorized','paid','cash_pending','cash_paid','cancelled','no_show_charged','refunded')),
  amount_cents integer,
  check (amount_cents >= 0),
  
  -- Cash / Setup Intent fields
  setup_intent_id text,
  payment_method_id text,
  payment_method text default 'card' check (payment_method in ('card','cash')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto update updated_at for bookings
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at
before update on bookings
for each row execute function set_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
    insert into public.profiles (id, full_name, role, created_at, updated_at)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
        'client',
        now(),
        now()
    );
    return new;
exception when unique_violation then
    -- Profile already exists, ignore
    return new;
end;
$$;

revoke execute on function public.handle_expired_requests() from public;
revoke execute on function public.handle_expired_requests() from anon;
revoke execute on function public.handle_expired_requests() from authenticated;
grant execute on function public.handle_expired_requests() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- 6) Payments (Legacy/Optional - keeping if previously defined, though schemas often evolve)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount_cents int not null,
  provider text not null default 'stripe',
  status text not null check (status in ('pending','succeeded','failed','refunded')) default 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

-- 7) Waitlist
create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references profiles(id) not null,
  date date not null,
  created_at timestamptz default now() not null
);

-- 8) Gallery Images
create table if not exists gallery_images (
    id uuid primary key default gen_random_uuid(),
    image_url text not null,
    image_path text,
    caption text,
    display_order integer default 0,
    active boolean default true,
    created_at timestamptz default now()
);

-- 9) Settings
create table if not exists settings (
    key text primary key,
    value text,
    description text
);

-- 10) Rate Limits (server-side only)
create table if not exists rate_limits (
    key text not null,
    window_start timestamptz not null,
    count integer not null default 0,
    primary key (key, window_start)
);

create table if not exists rate_limit_events (
    id uuid primary key default gen_random_uuid(),
    key text not null,
    prefix text not null,
    user_id uuid,
    ip text,
    endpoint text,
    method text,
    created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_bookings_barber_start on bookings(barber_id, start_datetime);
create index if not exists idx_bookings_client_start on bookings(client_id, start_datetime);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_availability_rules_barber_id on availability_rules(barber_id);
create index if not exists idx_bookings_barber_id on bookings(barber_id);
create index if not exists idx_bookings_client_id on bookings(client_id);
create index if not exists idx_bookings_service_id on bookings(service_id);
create index if not exists idx_time_off_barber_id on time_off(barber_id);
create index if not exists idx_waitlist_client_id on waitlist(client_id);
create index if not exists idx_rate_limits_window_start on rate_limits(window_start);
create index if not exists idx_rate_limit_events_created_at on rate_limit_events(created_at);
create index if not exists idx_rate_limit_events_prefix on rate_limit_events(prefix);

-- RLS Policies

alter table profiles enable row level security;
alter table services enable row level security;
alter table availability_rules enable row level security;
alter table time_off enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table waitlist enable row level security;
alter table gallery_images enable row level security;
alter table settings enable row level security;
alter table rate_limits enable row level security;
alter table rate_limit_events enable row level security;

-- Profiles policies (server-side admin access only)
create policy "Profiles read own" on profiles
  for select using (auth.uid() = id);
create policy "Profiles insert own" on profiles
  for insert with check (auth.uid() = id);
create policy "Profiles update own" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()));

-- Services policies (public read active only)
create policy "Services public read active" on services
  for select using (active = true);

-- Availability rules: server-only (no client policies)
create policy "deny_all_availability_rules" on availability_rules
  for all using (false) with check (false);

-- Time off: server-only (no client policies)
create policy "deny_all_time_off" on time_off
  for all using (false) with check (false);

-- Bookings policies (client insert + read; admin read)
create policy "Bookings insert own" on bookings
  for insert with check (auth.uid() = client_id);
create policy "Bookings select own or admin" on bookings
  for select using (
    auth.uid() = client_id
    or auth.uid() = barber_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Waitlist policies
create policy "Waitlist insert own" on waitlist
  for insert with check (auth.uid() = client_id);
create policy "Waitlist read own or admin" on waitlist
  for select using (
    auth.uid() = client_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Gallery Images policies (public read active only)
create policy "Gallery public read active" on gallery_images
  for select using (active = true);

-- Settings: server-only (no client policies)
create policy "deny_all_settings" on settings
  for all using (false) with check (false);

create policy "deny_all_rate_limits" on rate_limits
  for all using (false) with check (false);

create policy "deny_all_rate_limit_events" on rate_limit_events
  for all using (false) with check (false);

-- Rate limit helper (server-only)
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  window_start timestamptz;
  current_count integer;
begin
  if p_key is null or btrim(p_key) = '' then
    return false;
  end if;
  if p_max <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits(key, window_start, count)
  values (p_key, window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into current_count;

  return current_count <= p_max;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public;
revoke execute on function public.check_rate_limit(text, integer, integer) from anon;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

create or replace function public.cleanup_rate_limits(p_retention interval default interval '7 days')
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  delete from public.rate_limits
  where window_start < (now() - p_retention);
end;
$$;

revoke execute on function public.cleanup_rate_limits(interval) from public;
revoke execute on function public.cleanup_rate_limits(interval) from anon;
revoke execute on function public.cleanup_rate_limits(interval) from authenticated;
grant execute on function public.cleanup_rate_limits(interval) to service_role;

create or replace function public.cleanup_rate_limit_events(p_retention interval default interval '7 days')
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  delete from public.rate_limit_events
  where created_at < (now() - p_retention);
end;
$$;

revoke execute on function public.cleanup_rate_limit_events(interval) from public;
revoke execute on function public.cleanup_rate_limit_events(interval) from anon;
revoke execute on function public.cleanup_rate_limit_events(interval) from authenticated;
grant execute on function public.cleanup_rate_limit_events(interval) to service_role;

-- 11) Expired Requests Handler
create or replace function public.handle_expired_requests()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.bookings
  set status = 'declined',
      notes = coalesce(notes, '') || E'\n[System] Auto-declined: Request expired (6h rule).'
  where status = 'requested'
    and start_datetime < (now() + interval '6 hours');
end;
$$;
