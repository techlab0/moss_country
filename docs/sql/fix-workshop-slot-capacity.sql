-- 受付枠の定員をコード側（CAPACITY_PER_SLOT）に合わせる。Supabase SQL Editorで1回実行する。
--
-- 経緯: 2026-08-05に定員を4名から6名へ変更した際、コード・ワークショップページ・
-- カレンダーは更新されたが、このトリガーだけ4名のまま残っていた。
-- その結果、5〜6名の予約は画面上「空きあり」と表示されるのに、確定の瞬間に
-- WORKSHOP_SLOT_CAPACITY_EXCEEDED で失敗する状態になっていた
-- （お客様からは「空いているのに予約できない」ように見える）。
--
-- 重要: この数値は src/lib/workshopBookingConfig.ts の CAPACITY_PER_SLOT と
-- 必ず一致させること。片方だけ変えると上記の食い違いが再発する。
-- 一致しているかは管理画面の「ワークショップ診断」で確認できる。

BEGIN;

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

  -- CAPACITY_PER_SLOT と一致させること
  IF reserved_count + NEW.party_size > 6 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'WORKSHOP_SLOT_CAPACITY_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

-- 適用後の確認:
--   SELECT (regexp_match(prosrc, 'party_size > (\d+)'))[1] AS capacity
--     FROM pg_proc WHERE proname = 'enforce_workshop_slot_capacity';

-- 管理画面の診断（/api/admin/workshop-diagnostics）からDB側の定員を読めるようにする。
-- コードとDBの食い違いを機械的に検知するために使う。
-- 副作用が無く、定員という公開情報しか返さないためSECURITY DEFINERで問題ない。
CREATE OR REPLACE FUNCTION public.get_workshop_slot_capacity()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (regexp_match(prosrc, 'party_size > (\d+)'))[1]::INTEGER
    FROM pg_catalog.pg_proc
   WHERE proname = 'enforce_workshop_slot_capacity'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_workshop_slot_capacity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workshop_slot_capacity() TO service_role;
