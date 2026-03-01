-- Migration 001: Initial schema — loyalty_cards, users profile, privacy_log
-- Stories 6-1 / 6-2
--
-- IMPORTANT: The loyalty_cards cloud schema differs from local SQLite:
--   - Cloud: includes user_id (multi-tenant, many users)
--   - Local: no user_id (single user per device)
--
-- Sync logic maps between these schemas when pushing/pulling data.
-- All tables live in the public schema with RLS enabled (default-deny).

-- ============================================================
-- TABLE: public.loyalty_cards
-- ============================================================

CREATE TABLE IF NOT EXISTS public.loyalty_cards (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text    NOT NULL,
  barcode        text    NOT NULL,
  barcode_format text    NOT NULL,
  brand_id       text,
  color          text    NOT NULL,
  is_favorite    boolean NOT NULL DEFAULT false,
  last_used_at   text,
  usage_count    integer NOT NULL DEFAULT 0,
  created_at     text    NOT NULL,  -- ISO 8601
  updated_at     text    NOT NULL   -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_id    ON public.loyalty_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_created_at ON public.loyalty_cards(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_usage      ON public.loyalty_cards(usage_count, last_used_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_favorite   ON public.loyalty_cards(is_favorite);

ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
  ON public.loyalty_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
  ON public.loyalty_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
  ON public.loyalty_cards FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
  ON public.loyalty_cards FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: public.users (profile — linked to auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL UNIQUE,
  consent_status boolean,
  consented_at   text,         -- ISO 8601; NULL until consent given
  created_at     text NOT NULL -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLE: public.privacy_log (append-only GDPR audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.privacy_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'registration', 'consent_given', 'consent_withdrawn',
    'data_export', 'account_deletion'
  )),
  event_time text NOT NULL  -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_privacy_log_user_id    ON public.privacy_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_log_event_time ON public.privacy_log(event_time);

ALTER TABLE public.privacy_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy log"
  ON public.privacy_log FOR SELECT
  USING (auth.uid() = user_id);

-- NOTE: In production this may be replaced by a service-role-only SECURITY DEFINER function.
CREATE POLICY "Users can insert own privacy log entries"
  ON public.privacy_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies: append-only by design.
-- Row deletion handled automatically by ON DELETE CASCADE via auth.users FK.
