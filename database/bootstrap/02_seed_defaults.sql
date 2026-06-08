-- Bootstrap Step 2: Required default seed data
-- Ensure default reward types are exactly:
-- points, money, hearts, stars, diamonds

INSERT INTO custom_reward_types (
  type_key,
  display_name,
  icon,
  color,
  default_unit,
  is_accumulable,
  has_extra_input,
  extra_input_schema,
  is_system
) VALUES
  ('points', '點數', 'P', '#fbbf24', '點', TRUE, FALSE, NULL, TRUE),
  ('money', '金錢', '$', '#10b981', '元', TRUE, FALSE, NULL, TRUE),
  ('hearts', '愛心', 'H', '#ef4444', '顆', TRUE, FALSE, NULL, TRUE),
  ('stars', '星星', 'S', '#3b82f6', '顆', TRUE, FALSE, NULL, TRUE),
  ('diamonds', '鑽石', 'D', '#8b5cf6', '顆', TRUE, FALSE, NULL, TRUE)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  default_unit = EXCLUDED.default_unit,
  is_accumulable = EXCLUDED.is_accumulable,
  has_extra_input = EXCLUDED.has_extra_input,
  extra_input_schema = EXCLUDED.extra_input_schema,
  is_system = TRUE,
  updated_at = NOW();

-- Keep default order as:
-- 1 points, 2 money, 3 hearts, 4 stars, 5 diamonds
UPDATE custom_reward_types
SET display_order = CASE type_key
  WHEN 'points' THEN 1
  WHEN 'money' THEN 2
  WHEN 'hearts' THEN 3
  WHEN 'stars' THEN 4
  WHEN 'diamonds' THEN 5
  ELSE COALESCE(display_order, 999)
END
WHERE type_key IN ('points', 'money', 'hearts', 'stars', 'diamonds');

-- Note:
-- This default seed now keeps only required system-level data.
-- Locale-specific demo data (achievement events and mapping rules)
-- is split into:
-- - 04_seed_demo_zh-TW.sql
-- - 04_seed_demo_en.sql

-- AI assessment import defaults.
-- The feature is opt-in and remains disabled until the admin configures
-- AI_PROVIDER_KEY_ENCRYPTION_SECRET and at least one provider API key.
INSERT INTO public.site_settings (key, value)
VALUES
  ('ai_assessment_import_enabled', 'false'),
  ('ai_assessment_provider', 'openrouter'),
  ('ai_assessment_model_primary', 'openrouter/free'),
  ('ai_assessment_model_vision', ''),
  ('ai_assessment_model_text', ''),
  ('ai_assessment_model_fallback', ''),
  ('ai_assessment_processing_mode', 'multimodal'),
  ('ai_assessment_daily_limit', '10'),
  ('ai_assessment_monthly_limit', '100'),
  ('ai_assessment_student_daily_limit', '30'),
  ('ai_assessment_max_file_size_mb', '4'),
  ('ai_assessment_max_retries', '2'),
  ('ai_assessment_keep_source_file', 'false'),
  ('ai_assessment_source_retention_days', '7'),
  ('ai_assessment_detect_mistakes_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Private source-image bucket for AI assessment imports.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-imports',
  'assessment-imports',
  false,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();
