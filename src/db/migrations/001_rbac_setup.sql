-- 1. Create Enum
create type public.app_role as enum ('admin', 'commercial', 'supervisor');

-- 2. Create Profiles Table via standard specific SQL (checking if exists first if needed, but simple create is fine for now)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text,
  last_name text,
  role app_role default 'commercial',
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Create Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    '', -- Split logic can be added if needed, or just store full name in first_name for now or allow null
    'commercial' -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on rerun
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. RLS Policies for Profiles

-- Admin can see and edit all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 6. Grant usage on schema (optional, usually default is public)
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to postgres, service_role;
grant select, update, insert on public.profiles to authenticated;
