-- Store OCR-generated assessment details separately from user-authored notes.
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS ocr_content text;

COMMENT ON COLUMN public.assessments.ocr_content IS
'Formatted OCR content generated from assessment images.';

-- Migrate legacy OCR output that was previously stored in notes.
-- Strategy: strip the [OCR] prefix, then check if the remaining content
-- matches the OCR format (label: value pairs separated by | or ,).
-- If it does → pure OCR, clear notes. If not → user added text, preserve it.
UPDATE public.assessments
SET
  ocr_content = COALESCE(
    NULLIF(ocr_content, ''),
    regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
  ),
  notes = CASE
    -- After stripping [OCR] prefix, does the remainder look like pure OCR output?
    -- OCR format: "label: value | label: value | ..." or "label: value, label: value, ..."
    WHEN regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
         ~ '^[^:|,]+:[[:space:]]*[^|,]*(?:[[:space:]]*[|,][[:space:]]*[^:|,]+:[[:space:]]*[^|,]*)*[[:space:]]*$'
      THEN NULL
    -- Has user-added text after OCR prefix — strip only the OCR part
    ELSE regexp_replace(notes, '^\[OCR\][[:space:]]*(\|[[:space:]]*)?', '')
  END
WHERE notes LIKE '[OCR]%';
