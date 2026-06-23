-- Disable Row Level Security (RLS) on all tables so unauthenticated staff can interact
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_support DISABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE breaks DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs DISABLE ROW LEVEL SECURITY;

-- Drop the foreign key constraint that requires a profile to have an auth.users record
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
