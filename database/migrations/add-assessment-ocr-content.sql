-- Store OCR-generated assessment details separately from user-authored notes.
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS ocr_content text;

COMMENT ON COLUMN public.assessments.ocr_content IS
'Formatted OCR content generated from assessment images.';

-- Migrate legacy OCR output that was previously stored in notes.
-- Only clear notes when the ENTIRE content is OCR output (no user-added text
-- after the OCR prefix). If the user appended their own text, preserve it.
UPDATE public.assessments
SET
  ocr_content = COALESCE(
    NULLIF(ocr_content, ''),
    regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
  ),
  notes = CASE
    -- Has user-added text after OCR prefix — strip only the OCR part
    WHEN notes ~ '^\[OCR\][[:space:]]*(\|[[:space:]]*)?[^|]' THEN
      regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
    ELSE
      -- Pure OCR output — clear notes entirely
      NULL
  END
WHERE notes LIKE '[OCR]%';
