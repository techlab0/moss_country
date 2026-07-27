-- ワークショップ予約の同時実行・再送・公開API悪用への対策。
-- 既存の workshop_bookings テーブル作成後に、Supabase SQL Editorで1回実行する。
-- 再実行しても安全なようにIF NOT EXISTS / CREATE OR REPLACEを使用する。

BEGIN;

-- 同じブラウザ操作の再送を一意に識別する。既存行はNULLのままでよい。
ALTER TABLE public.workshop_bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workshop_bookings_idempotency_key
  ON public.workshop_bookings(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 同一日・同一開始時刻のINSERT/UPDATEを直列化し、合計4名をDBで強制する。
-- アプリ側の事前確認は表示用であり、最終保証はこのトリガーが担当する。
CREATE OR REPLACE FUNCTION public.enforce_workshop_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  reserved_count INTEGER;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.date::TEXT || '|' || NEW.start_time, 0)
  );

  SELECT COALESCE(SUM(party_size), 0)
    INTO reserved_count
    FROM public.workshop_bookings
   WHERE date = NEW.date
     AND start_time = NEW.start_time
     AND status = 'confirmed'
     AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF reserved_count + NEW.party_size > 4 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'WORKSHOP_SLOT_CAPACITY_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_workshop_slot_capacity_trigger
  ON public.workshop_bookings;

CREATE TRIGGER enforce_workshop_slot_capacity_trigger
  BEFORE INSERT OR UPDATE OF date, start_time, party_size, status
  ON public.workshop_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workshop_slot_capacity();

-- Vercelの複数インスタンスで共有できる固定窓レート制限。
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit <= 0 OR p_window_seconds <= 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits AS limits (
    key,
    request_count,
    reset_at,
    updated_at
  )
  VALUES (
    p_key,
    1,
    NOW() + make_interval(secs => p_window_seconds),
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    request_count = CASE
      WHEN limits.reset_at <= NOW() THEN 1
      ELSE limits.request_count + 1
    END,
    reset_at = CASE
      WHEN limits.reset_at <= NOW()
        THEN NOW() + make_interval(secs => p_window_seconds)
      ELSE limits.reset_at
    END,
    updated_at = NOW()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

COMMIT;
