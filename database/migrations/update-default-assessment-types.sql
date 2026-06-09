-- Update default assessment types to:
-- quiz => 測驗, exam => 小考, term_exam => 段考, homework, project.
-- Existing is_active values are preserved so hidden defaults stay hidden.

BEGIN;

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

COMMIT;
