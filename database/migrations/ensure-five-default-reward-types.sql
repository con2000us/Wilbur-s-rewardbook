-- Ensure default reward types are exactly:
-- points, money, hearts, stars, diamonds

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    INSERT INTO custom_reward_types (
      type_key, display_name, icon, color, default_unit,
      is_accumulable, has_extra_input, extra_input_schema, is_system
    ) VALUES
      ('points', '積分', '⭐', '#fbbf24', '分', TRUE, FALSE, NULL, TRUE),
      ('money', '獎金', '💰', '#10b981', '元', TRUE, FALSE, NULL, TRUE),
      ('hearts', '愛心', '❤️', '#ef4444', '顆', TRUE, FALSE, NULL, TRUE),
      ('stars', '星星', '🌟', '#3b82f6', '顆', TRUE, FALSE, NULL, TRUE),
      ('diamonds', '鑽石', '💎', '#8b5cf6', '顆', TRUE, FALSE, NULL, TRUE)
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
  ELSE
    INSERT INTO custom_reward_types (
      type_key, display_name_zh, display_name_en, icon, color, default_unit,
      is_accumulable, has_extra_input, extra_input_schema, is_system
    ) VALUES
      ('points', '積分', 'Points', '⭐', '#fbbf24', '分', TRUE, FALSE, NULL, TRUE),
      ('money', '獎金', 'Money', '💰', '#10b981', '元', TRUE, FALSE, NULL, TRUE),
      ('hearts', '愛心', 'Hearts', '❤️', '#ef4444', '顆', TRUE, FALSE, NULL, TRUE),
      ('stars', '星星', 'Stars', '🌟', '#3b82f6', '顆', TRUE, FALSE, NULL, TRUE),
      ('diamonds', '鑽石', 'Diamonds', '💎', '#8b5cf6', '顆', TRUE, FALSE, NULL, TRUE)
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

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
