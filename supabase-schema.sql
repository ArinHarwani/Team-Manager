-- ==============================================================================
-- Retail Ops: Full Team Manager Schema v2
-- Project ID: asvabwgrpeoojznudetc
-- Run this complete script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/asvabwgrpeoojznudetc/sql
-- ==============================================================================

-- 1. PROFILES (admin + staff — no auth.users dependency)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Drop old auth FK if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
END $$;

-- 2. TEAM GROUPS (e.g., "Tops", "One Piece", "Bottoms")
CREATE TABLE IF NOT EXISTS team_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DAILY_TEAMS — now belong to a group
CREATE TABLE IF NOT EXISTS daily_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    team_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    group_id UUID REFERENCES team_groups(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (date, team_number, group_id)
);

-- 4. TEAM_MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES daily_teams(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (team_id, staff_id)
);

-- 5. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    notes TEXT,
    team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    group_id UUID REFERENCES team_groups(id) ON DELETE SET NULL,
    handler_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'attending', 'completed', 'sale_success', 'sale_failed')),
    date DATE DEFAULT CURRENT_DATE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    outcome_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. GROUP_ALLOCATION_STATE — per-group round-robin pointer
CREATE TABLE IF NOT EXISTS group_allocation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES team_groups(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    next_team_index INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (group_id, date)
);

-- 7. STAFF_STATUS
CREATE TABLE IF NOT EXISTS staff_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline',
    current_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. HELP_REQUESTS (admin-only notifications)
CREATE TABLE IF NOT EXISTS help_requests (
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

-- 9. OVERRIDE_LOGS
CREATE TABLE IF NOT EXISTS override_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    original_team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    new_team_id UUID REFERENCES daily_teams(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. BREAKS
CREATE TABLE IF NOT EXISTS breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    date DATE DEFAULT CURRENT_DATE
);

-- ==============================================================================
-- DISABLE RLS (name-only login bypass, no Supabase Auth)
-- ==============================================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_allocation_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE override_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE breaks DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- REALTIME
-- ==============================================================================
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE daily_teams; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_allocation_state; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE staff_status; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE help_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE breaks; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ==============================================================================
-- SEED DATA (safe to re-run)
-- ==============================================================================

-- Default admin
INSERT INTO public.profiles (name, role, is_active)
VALUES ('Store Manager', 'admin', true)
ON CONFLICT DO NOTHING;

-- Sample staff
INSERT INTO public.profiles (name, role, is_active)
VALUES 
    ('Arin Harwani', 'staff', true),
    ('Priya Singh', 'staff', true),
    ('Raj Kumar', 'staff', true),
    ('Meena Patel', 'staff', true)
ON CONFLICT DO NOTHING;
