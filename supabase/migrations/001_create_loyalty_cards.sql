-- Migration 001: Create loyalty_cards table for multi-tenant cloud storage
-- Story 6-1: Create Supabase Project & Environments
--
-- IMPORTANT: This schema differs from local SQLite in one key way:
--   - Cloud: Includes user_id (multi-tenant, many users)
--   - Local: No user_id (single user per device)
--
-- Sync logic will map between these schemas when pushing/pulling data.

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  barcode text NOT NULL,
  barcode_format text NOT NULL,
  brand_id text,
  color text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  last_used_at text,
  usage_count integer NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_id ON loyalty_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_created_at ON loyalty_cards(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_usage ON loyalty_cards(usage_count, last_used_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_favorite ON loyalty_cards(is_favorite);

-- Row Level Security (RLS) Policies
-- Users can only see and manage their own cards
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cards
CREATE POLICY "Users can view their own cards"
  ON loyalty_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own cards
CREATE POLICY "Users can insert their own cards"
  ON loyalty_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cards
CREATE POLICY "Users can update their own cards"
  ON loyalty_cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own cards
CREATE POLICY "Users can delete their own cards"
  ON loyalty_cards
  FOR DELETE
  USING (auth.uid() = user_id);
