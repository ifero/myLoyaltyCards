-- Migration 002: Create users profile and privacy_log tables
-- Story 6-2: Define Cloud Schema & Row-Level Security
--
-- Creates two tables supporting user profiles and GDPR-grade audit trail:
--   - public.users     → user profile linked to auth.users (email, consent)
--   - public.privacy_log → immutable audit log of auth/consent events
--
-- The loyalty_cards table was created in migration 001.
-- All tables have RLS enabled; only the owning user can access their rows.

-- ============================================================
-- TABLE: public.users (user profile)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  consent_status boolean,
  consented_at   text,          -- ISO 8601 timestamp of consent; NULL until consent given
  created_at     text NOT NULL  -- ISO 8601 creation time
);

-- Index for common lookup pattern
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================
-- RLS: public.users
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (called once after signup)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile (e.g., consent changes)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLE: public.privacy_log (audit trail)
-- ============================================================

-- Valid event types: login, registration, consent_given, consent_withdrawn, data_export, account_deletion
CREATE TABLE IF NOT EXISTS public.privacy_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_time text NOT NULL  -- ISO 8601
);

-- Indexes for time-ordered queries per user
CREATE INDEX IF NOT EXISTS idx_privacy_log_user_id    ON public.privacy_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_log_event_time ON public.privacy_log(event_time);

-- ============================================================
-- RLS: public.privacy_log
-- ============================================================

ALTER TABLE public.privacy_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own log entries (e.g., data transparency page)
CREATE POLICY "Users can view own privacy log"
  ON public.privacy_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users (via server-side code) can insert their own log entries
-- NOTE: In production this policy may be replaced by a service-role-only insert.
CREATE POLICY "Users can insert own privacy log entries"
  ON public.privacy_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies: the audit log is append-only by design.
-- Deletion is handled by ON DELETE CASCADE via the auth.users FK.
