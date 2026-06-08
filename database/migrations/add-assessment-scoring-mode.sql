-- Add assessment calculation controls for record-only assessments.
-- record_only assessments can keep dates, notes, images, and mistakes without
-- affecting averages or reward transactions.

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS scoring_mode TEXT DEFAULT 'scored',
ADD COLUMN IF NOT EXISTS counts_toward_average BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS counts_toward_reward BOOLEAN DEFAULT true;

UPDATE public.assessments
SET
  scoring_mode = COALESCE(scoring_mode, 'scored'),
  counts_toward_average = COALESCE(counts_toward_average, true),
  counts_toward_reward = COALESCE(counts_toward_reward, true);

ALTER TABLE public.assessments
ALTER COLUMN scoring_mode SET DEFAULT 'scored',
ALTER COLUMN scoring_mode SET NOT NULL,
ALTER COLUMN counts_toward_average SET DEFAULT true,
ALTER COLUMN counts_toward_average SET NOT NULL,
ALTER COLUMN counts_toward_reward SET DEFAULT true,
ALTER COLUMN counts_toward_reward SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessments_scoring_mode_check'
      AND conrelid = 'public.assessments'::regclass
  ) THEN
    ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_scoring_mode_check
    CHECK (scoring_mode IN ('scored', 'record_only'));
  END IF;
END $$;

COMMENT ON COLUMN public.assessments.scoring_mode IS
'Assessment calculation mode. scored participates in normal score handling; record_only stores the assessment as evidence only.';

COMMENT ON COLUMN public.assessments.counts_toward_average IS
'When false, this assessment is excluded from subject and assessment average calculations.';

COMMENT ON COLUMN public.assessments.counts_toward_reward IS
'When false, this assessment does not create assessment reward transactions.';

CREATE INDEX IF NOT EXISTS idx_assessments_average_included
ON public.assessments(subject_id, status)
WHERE counts_toward_average = true AND percentage IS NOT NULL;
