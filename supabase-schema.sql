-- Retail Ops: Supabase Schema

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DAILY_TEAMS
CREATE TABLE daily_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    team_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (date, team_number)
);

-- 3. TEAM_MEMBERS
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES daily_teams(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (team_id, staff_id)
);

-- 4. CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    notes TEXT,
    team_id UUID REFERENCES daily_teams(id),
    handler_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'waiting',
    date DATE DEFAULT CURRENT_DATE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CUSTOMER_SUPPORT
CREATE TABLE customer_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ALLOCATION_STATE
CREATE TABLE allocation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE DEFAULT CURRENT_DATE,
    next_team_index INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. STAFF_STATUS
CREATE TABLE staff_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline',
    current_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. BREAKS
CREATE TABLE breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    date DATE DEFAULT CURRENT_DATE
);

-- 9. HELP_REQUESTS
CREATE TABLE help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    message TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. OVERRIDE_LOGS
CREATE TABLE override_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    original_team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    new_team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. AUTOMATED CLEANUP (3 Days Retention)
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Delete old customers (cascades to customer_support, override_logs)
    DELETE FROM customers WHERE date < CURRENT_DATE - INTERVAL '3 days';
    
    -- Delete old daily_teams (cascades to team_members)
    DELETE FROM daily_teams WHERE date < CURRENT_DATE - INTERVAL '3 days';
    
    -- Delete old breaks
    DELETE FROM breaks WHERE date < CURRENT_DATE - INTERVAL '3 days';
    
    -- Delete old help requests
    DELETE FROM help_requests WHERE created_at < CURRENT_DATE - INTERVAL '3 days';
    
    -- Delete old allocation_state
    DELETE FROM allocation_state WHERE date < CURRENT_DATE - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule the cleanup (00:00 IST = 18:30 UTC)
SELECT cron.schedule('cleanup', '30 18 * * *', 'SELECT cleanup_old_data()');

-- REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_status;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE allocation_state;
ALTER PUBLICATION supabase_realtime ADD TABLE help_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE breaks;

-- ROW LEVEL SECURITY (RLS)
-- By default, tables are secure when RLS is enabled, we need to create policies.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Admin full CRUD. Staff can read all, update own.
CREATE POLICY "Admin can manage profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "Staff can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Staff can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Daily Teams: Admin full CRUD. Staff can read.
CREATE POLICY "Admin can manage daily_teams" ON daily_teams FOR ALL USING (is_admin());
CREATE POLICY "Staff can view daily_teams" ON daily_teams FOR SELECT USING (true);

-- Team Members: Admin full CRUD. Staff can read.
CREATE POLICY "Admin can manage team_members" ON team_members FOR ALL USING (is_admin());
CREATE POLICY "Staff can view team_members" ON team_members FOR SELECT USING (true);

-- Customers: Admin full CRUD. Staff can read.
CREATE POLICY "Admin can manage customers" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Staff can view customers" ON customers FOR SELECT USING (true);

-- Customer Support: Admin full CRUD. Staff can read.
CREATE POLICY "Admin can manage customer_support" ON customer_support FOR ALL USING (is_admin());
CREATE POLICY "Staff can view customer_support" ON customer_support FOR SELECT USING (true);

-- Allocation State: Admin full CRUD. Staff can read.
CREATE POLICY "Admin can manage allocation_state" ON allocation_state FOR ALL USING (is_admin());
CREATE POLICY "Staff can view allocation_state" ON allocation_state FOR SELECT USING (true);

-- Staff Status: Admin full CRUD. Staff can read all, update own.
CREATE POLICY "Admin can manage staff_status" ON staff_status FOR ALL USING (is_admin());
CREATE POLICY "Staff can view staff_status" ON staff_status FOR SELECT USING (true);
CREATE POLICY "Staff can insert own staff_status" ON staff_status FOR INSERT WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Staff can update own staff_status" ON staff_status FOR UPDATE USING (auth.uid() = staff_id);

-- Breaks: Admin full CRUD. Staff can read all, insert/update own.
CREATE POLICY "Admin can manage breaks" ON breaks FOR ALL USING (is_admin());
CREATE POLICY "Staff can view breaks" ON breaks FOR SELECT USING (true);
CREATE POLICY "Staff can manage own breaks" ON breaks FOR INSERT WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Staff can update own breaks" ON breaks FOR UPDATE USING (auth.uid() = staff_id);

-- Help Requests: Admin full CRUD. Staff can insert own, read own.
CREATE POLICY "Admin can manage help_requests" ON help_requests FOR ALL USING (is_admin());
CREATE POLICY "Staff can insert own help_requests" ON help_requests FOR INSERT WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Staff can view own help_requests" ON help_requests FOR SELECT USING (auth.uid() = staff_id);

-- Override Logs: Admin full CRUD. Staff none.
CREATE POLICY "Admin can manage override_logs" ON override_logs FOR ALL USING (is_admin());

-- CREATE FIRST ADMIN SCRIPT (To run manually after creating the auth user in Supabase UI)
/*
1. Go to Authentication -> Users -> Add User -> Create new user (or invite).
2. Get the new user's UUID.
3. Run this query to make them an admin:

INSERT INTO public.profiles (id, name, role, is_active)
VALUES ('<THE_UUID_HERE>', 'Store Manager', 'admin', true);
*/
