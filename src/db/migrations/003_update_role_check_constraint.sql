-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;

-- Add the new constraint including 'supervisor'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
