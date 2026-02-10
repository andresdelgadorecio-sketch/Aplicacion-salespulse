-- Add email column to profiles
alter table public.profiles 
add column if not exists email text;

-- Update handle_new_user function to include email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    '', 
    'commercial',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill existing profiles with email from auth.users
-- This requires the executor to have permissions on auth.users (which postgres/service_role usually does)
-- or we rely on the fact that we are running this as a superuser/admin in SQL editor.
update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.id = auth.users.id
and public.profiles.email is null;
