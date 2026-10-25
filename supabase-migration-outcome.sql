-- Migration: Add outcome_reason to customers table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/asvabwgrpeoojznudetc/sql/new

ALTER TABLE customers ADD COLUMN IF NOT EXISTS outcome_reason TEXT;
