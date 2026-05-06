-- Seed default achievement events and reward mappings (canonical key version)
-- For locale-specific bootstrap, prefer:
-- - database/bootstrap/04_seed_demo_zh-TW.sql
-- - database/bootstrap/04_seed_demo_en.sql

ALTER TABLE achievement_events
ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_events_event_key_unique
ON achievement_events(event_key);

CREATE TABLE IF NOT EXISTS achievement_event_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES achievement_events(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, locale)
);

INSERT INTO achievement_events (event_key, name_zh, name_en, description_zh, description_en, is_active, display_order)
VALUES
  ('homework_on_time', '作業準時完成', 'Homework On Time', '作業按時繳交', 'Submit homework on time', TRUE, 1),
  ('self_review', '主動複習', 'Self Review', '自主安排複習', 'Take initiative to review', TRUE, 2),
  ('great_quiz_performance', '小考表現優良', 'Great Quiz Performance', '小考達到目標成績', 'Reach target score in quiz', TRUE, 3),
  ('active_participation', '課堂參與積極', 'Active Participation', '課堂參與與回應積極', 'Actively participate in class', TRUE, 4),
  ('help_classmates', '主動幫助同學', 'Help Classmates', '主動協助同儕學習', 'Help classmates proactively', TRUE, 5)
ON CONFLICT (event_key) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  description_zh = EXCLUDED.description_zh,
  description_en = EXCLUDED.description_en,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT id, 'zh-TW', name_zh, description_zh
FROM achievement_events
WHERE event_key IN ('homework_on_time', 'self_review', 'great_quiz_performance', 'active_participation', 'help_classmates')
ON CONFLICT (event_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT id, 'en', name_en, description_en
FROM achievement_events
WHERE event_key IN ('homework_on_time', 'self_review', 'great_quiz_performance', 'active_participation', 'help_classmates')
ON CONFLICT (event_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO achievement_event_reward_rules (event_id, reward_type_id, default_amount, is_default)
SELECT
  e.id,
  rt.id,
  x.default_amount,
  TRUE
FROM (
  VALUES
    ('homework_on_time', 'points', 5::numeric),
    ('self_review', 'stars', 1::numeric),
    ('great_quiz_performance', 'money', 10::numeric),
    ('active_participation', 'hearts', 1::numeric),
    ('help_classmates', 'diamonds', 1::numeric)
) AS x(event_key, reward_type_key, default_amount)
JOIN achievement_events e ON e.event_key = x.event_key
JOIN custom_reward_types rt ON rt.type_key = x.reward_type_key
ON CONFLICT (event_id, reward_type_id) DO UPDATE SET
  default_amount = EXCLUDED.default_amount,
  is_default = EXCLUDED.is_default;
