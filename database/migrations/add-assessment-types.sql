-- Move assessment type configuration from hard-coded values to assessment_types.
-- Runtime code should use assessment_types and should not keep legacy enum fallbacks.

BEGIN;

CREATE TABLE IF NOT EXISTS public.assessment_types (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  type_key text NOT NULL,
  display_name text NOT NULL,
  icon text DEFAULT 'assignment'::text NOT NULL,
  color text DEFAULT '#64748b'::text,
  display_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_types_pkey'
    AND conrelid = 'public.assessment_types'::regclass
  ) THEN
    ALTER TABLE public.assessment_types
      ADD CONSTRAINT assessment_types_pkey PRIMARY KEY (id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_types_type_key_key'
    AND conrelid = 'public.assessment_types'::regclass
  ) THEN
    ALTER TABLE public.assessment_types
      ADD CONSTRAINT assessment_types_type_key_key UNIQUE (type_key);
  END IF;
END$$;

INSERT INTO public.assessment_types (
  type_key,
  display_name,
  icon,
  color,
  display_order,
  is_active,
  is_system
) VALUES
  ('quiz', '測驗', 'checklist_rtl', '#2563eb', 1, TRUE, TRUE),
  ('exam', '小考', 'assignment', '#dc2626', 2, TRUE, TRUE),
  ('term_exam', '段考', 'fact_check', '#f59e0b', 3, TRUE, TRUE),
  ('homework', '作業', 'edit_note', '#16a34a', 4, TRUE, TRUE),
  ('project', '專題', 'palette', '#9333ea', 5, TRUE, TRUE)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  is_system = TRUE,
  updated_at = NOW();

ALTER TABLE public.assessments
  DROP CONSTRAINT IF EXISTS assessments_assessment_type_check;

ALTER TABLE public.assessment_import_drafts
  DROP CONSTRAINT IF EXISTS assessment_import_drafts_assessment_type_check;

INSERT INTO public.assessment_types (
  type_key,
  display_name,
  icon,
  color,
  display_order,
  is_active,
  is_system
)
SELECT DISTINCT type_key, type_key, 'assignment', '#64748b', 999, FALSE, FALSE
FROM (
  SELECT assessment_type AS type_key FROM public.assessments WHERE assessment_type IS NOT NULL
  UNION
  SELECT assessment_type AS type_key FROM public.reward_rules WHERE assessment_type IS NOT NULL
  UNION
  SELECT assessment_type AS type_key FROM public.assessment_import_drafts WHERE assessment_type IS NOT NULL
) used_types
WHERE type_key IS NOT NULL
ON CONFLICT (type_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_assessment_types_type_key
  ON public.assessment_types USING btree (type_key);

CREATE INDEX IF NOT EXISTS idx_assessment_types_display_order
  ON public.assessment_types USING btree (display_order);

CREATE INDEX IF NOT EXISTS idx_assessment_types_is_active
  ON public.assessment_types USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_assessments_assessment_type
  ON public.assessments USING btree (assessment_type);

CREATE INDEX IF NOT EXISTS idx_reward_rules_assessment_type
  ON public.reward_rules USING btree (assessment_type);

CREATE INDEX IF NOT EXISTS idx_assessment_import_drafts_assessment_type
  ON public.assessment_import_drafts USING btree (assessment_type);

ALTER TABLE public.assessments
  DROP CONSTRAINT IF EXISTS assessments_assessment_type_fkey;

ALTER TABLE public.reward_rules
  DROP CONSTRAINT IF EXISTS reward_rules_assessment_type_fkey;

ALTER TABLE public.assessment_import_drafts
  DROP CONSTRAINT IF EXISTS assessment_import_drafts_assessment_type_fkey;

ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_assessment_type_fkey
  FOREIGN KEY (assessment_type)
  REFERENCES public.assessment_types(type_key)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE public.reward_rules
  ADD CONSTRAINT reward_rules_assessment_type_fkey
  FOREIGN KEY (assessment_type)
  REFERENCES public.assessment_types(type_key)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE public.assessment_import_drafts
  ADD CONSTRAINT assessment_import_drafts_assessment_type_fkey
  FOREIGN KEY (assessment_type)
  REFERENCES public.assessment_types(type_key)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to assessment types" ON public.assessment_types;
CREATE POLICY "Allow read access to assessment types"
  ON public.assessment_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert assessment types" ON public.assessment_types;
CREATE POLICY "Allow insert assessment types"
  ON public.assessment_types FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update assessment types" ON public.assessment_types;
CREATE POLICY "Allow update assessment types"
  ON public.assessment_types FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete assessment types" ON public.assessment_types;
CREATE POLICY "Allow delete assessment types"
  ON public.assessment_types FOR DELETE USING ((is_system = false));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessment_types TO anon, authenticated;

COMMIT;
