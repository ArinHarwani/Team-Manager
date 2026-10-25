-- ==============================================================================
-- Migration: Add group_id & missing columns to daily_teams and customers
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/asvabwgrpeoojznudetc/sql/new
-- ==============================================================================

-- 1. Ensure team_groups exists
CREATE TABLE IF NOT EXISTS team_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns to daily_teams
ALTER TABLE daily_teams ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES team_groups(id) ON DELETE SET NULL;
ALTER TABLE daily_teams ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Drop legacy unique constraint on (date, team_number) if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_teams_date_team_number_key' AND table_name = 'daily_teams'
    ) THEN
        ALTER TABLE daily_teams DROP CONSTRAINT daily_teams_date_team_number_key;
    END IF;
END $$;

-- 3. Add missing columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES team_groups(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS outcome_reason TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- 4. Ensure group_allocation_state exists
CREATE TABLE IF NOT EXISTS group_allocation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES team_groups(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    next_team_index INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (group_id, date)
);

-- 5. Ensure RLS is disabled
ALTER TABLE team_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_allocation_state DISABLE ROW LEVEL SECURITY;

-- 6. Ensure realtime is enabled
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE daily_teams; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_allocation_state; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7. Force Supabase API to reload schema cache immediately
NOTIFY pgrst, 'reload config';
