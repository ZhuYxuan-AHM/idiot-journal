-- ╔══════════════════════════════════════════════════════════════╗
-- ║  I.D.I.O.T. 若智 — Migration 003: PDF Upload & IDIOT IDs   ║
-- ║  Run AFTER 001 and 002 in Supabase SQL Editor               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── Add PDF and metadata fields to submissions ──────────────
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS authors text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affiliation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS abstract_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS abstract_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS keywords text NOT NULL DEFAULT '';

-- ─── Add PDF URL and IDIOT ID to articles ────────────────────
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS idiot_id text UNIQUE;

-- ─── Sequence for auto-incrementing article numbers ──────────
CREATE SEQUENCE IF NOT EXISTS public.article_number_seq START 1;

-- ─── Function to generate IDIOT ID ──────────────────────────
CREATE OR REPLACE FUNCTION public.generate_idiot_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.idiot_id IS NULL AND NEW.status = 'published' THEN
    NEW.idiot_id := 'IDIOT-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.article_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
DROP TRIGGER IF EXISTS trg_article_idiot_id ON public.articles;
CREATE TRIGGER trg_article_idiot_id
  BEFORE INSERT ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.generate_idiot_id();

-- Trigger on UPDATE (when status changes to published)
CREATE OR REPLACE FUNCTION public.generate_idiot_id_on_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.idiot_id IS NULL AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.idiot_id := 'IDIOT-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(nextval('public.article_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_idiot_id_update ON public.articles;
CREATE TRIGGER trg_article_idiot_id_update
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.generate_idiot_id_on_update();

-- ─── Backfill IDIOT IDs for existing seed articles ───────────
UPDATE public.articles SET idiot_id = 'IDIOT-2026-' || LPAD((ROW_NUMBER() OVER (ORDER BY published_at))::text, 4, '0')
WHERE idiot_id IS NULL;

-- ─── Helper: Publish a submission → creates article ──────────
-- Call: SELECT publish_submission('submission-uuid-here');
CREATE OR REPLACE FUNCTION public.publish_submission(sub_id uuid, p_vol text DEFAULT '1', p_issue text DEFAULT '1', p_featured boolean DEFAULT false)
RETURNS text AS $$
DECLARE
  sub record;
  new_id uuid;
  new_idiot_id text;
BEGIN
  SELECT * INTO sub FROM public.submissions WHERE id = sub_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;

  INSERT INTO public.articles (
    vol, issue, featured, published_at, classification,
    title_en, title_zh, authors, affiliation,
    abstract_en, abstract_zh, keywords, model_examined,
    status, pdf_url
  ) VALUES (
    p_vol, p_issue, p_featured, CURRENT_DATE, sub.classification,
    sub.title, '', sub.authors, sub.affiliation,
    sub.abstract_en, sub.abstract_zh, sub.keywords, 'N/A',
    'published', sub.pdf_url
  ) RETURNING id, idiot_id INTO new_id, new_idiot_id;

  UPDATE public.submissions SET status = 'published' WHERE id = sub_id;

  RETURN new_idiot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Storage: Allow authenticated users to upload PDFs ───────
-- NOTE: You must create a "papers" bucket in Supabase Storage first!
-- Then run these policies:

-- Allow anyone to read PDFs (public access)
CREATE POLICY "Public read papers" ON storage.objects
  FOR SELECT USING (bucket_id = 'papers');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Auth upload papers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'papers' AND auth.role() = 'authenticated');

-- ─── RLS: Allow public read on submissions (for profile) ────
CREATE POLICY "Users read own submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);
