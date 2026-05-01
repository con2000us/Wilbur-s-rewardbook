-- Bootstrap Step 2: Required default seed data
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

-- Default achievement events (for transaction form dropdown)
INSERT INTO achievement_events (name_zh, name_en, description_zh, description_en, is_active, display_order)
SELECT * FROM (
  VALUES
    ('作業準時完成', 'Homework On Time', '作業按時繳交', 'Submit homework on time', TRUE, 1),
    ('主動複習', 'Self Review', '自主安排複習', 'Take initiative to review', TRUE, 2),
    ('小考表現優良', 'Great Quiz Performance', '小考達到目標成績', 'Reach target score in quiz', TRUE, 3),
    ('課堂參與積極', 'Active Participation', '課堂參與與回應積極', 'Actively participate in class', TRUE, 4),
    ('主動幫助同學', 'Help Classmates', '主動協助同儕學習', 'Help classmates proactively', TRUE, 5)
) AS v(name_zh, name_en, description_zh, description_en, is_active, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM achievement_events e WHERE e.name_zh = v.name_zh
);

-- Default event -> reward type mapping rules
INSERT INTO achievement_event_reward_rules (event_id, reward_type_id, default_amount, is_default)
SELECT
  e.id,
  rt.id,
  x.default_amount,
  TRUE
FROM (
  VALUES
    ('作業準時完成', 'points', 5::numeric),
    ('主動複習', 'stars', 1::numeric),
    ('小考表現優良', 'money', 10::numeric),
    ('課堂參與積極', 'hearts', 1::numeric),
    ('主動幫助同學', 'diamonds', 1::numeric)
) AS x(event_name_zh, reward_type_key, default_amount)
JOIN achievement_events e ON e.name_zh = x.event_name_zh
JOIN custom_reward_types rt ON rt.type_key = x.reward_type_key
ON CONFLICT (event_id, reward_type_id) DO UPDATE SET
  default_amount = EXCLUDED.default_amount,
  is_default = EXCLUDED.is_default;
