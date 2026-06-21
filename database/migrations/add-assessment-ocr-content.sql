-- Store OCR-generated assessment details separately from user-authored notes.
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS ocr_content text;

COMMENT ON COLUMN public.assessments.ocr_content IS
'Formatted OCR content generated from assessment images.';

-- Migrate legacy OCR output that was previously stored in notes.
UPDATE public.assessments
SET
  ocr_content = COALESCE(
    NULLIF(ocr_content, ''),
    regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
  ),
  notes = NULL
WHERE notes LIKE '[OCR]%';
