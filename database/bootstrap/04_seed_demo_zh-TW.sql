-- Bootstrap Step 4 (optional): zh-TW demo data
-- Includes:
-- 1) Demo achievement event templates
-- 2) Translation rows (zh-TW + en fallback)
-- 3) Default event reward mappings
-- 4) Demo exchange rules + translations

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

DROP TRIGGER IF EXISTS update_achievement_event_translations_updated_at ON achievement_event_translations;
CREATE TRIGGER update_achievement_event_translations_updated_at
BEFORE UPDATE ON achievement_event_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE exchange_rules
ADD COLUMN IF NOT EXISTS rule_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rules_rule_key_unique
ON exchange_rules(rule_key);

CREATE TABLE IF NOT EXISTS exchange_rule_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES exchange_rules(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('zh-TW', 'en')),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (rule_id, locale)
);

DROP TRIGGER IF EXISTS update_exchange_rule_translations_updated_at ON exchange_rule_translations;
CREATE TRIGGER update_exchange_rule_translations_updated_at
BEFORE UPDATE ON exchange_rule_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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

INSERT INTO exchange_rules (
  rule_key,
  name_zh,
  name_en,
  description_zh,
  description_en,
  required_reward_type_id,
  required_amount,
  reward_type_id,
  reward_amount,
  is_active,
  display_order
)
SELECT
  x.rule_key,
  x.name_zh,
  x.name_en,
  x.description_zh,
  x.description_en,
  req.id,
  x.required_amount,
  reward.id,
  x.reward_amount,
  TRUE,
  x.display_order
FROM (
  VALUES
    ('points_to_money_basic', '積分兌換獎金', 'Points to Money', '累積 100 積分可兌換 10 元獎金', 'Exchange 100 points for 10 money', 'points', 100::numeric, 'money', 10::numeric, 1),
    ('stars_to_diamonds', '星星兌換鑽石', 'Stars to Diamonds', '集滿 5 顆星星可兌換 1 顆鑽石', 'Exchange 5 stars for 1 diamond', 'stars', 5::numeric, 'diamonds', 1::numeric, 2)
) AS x(
  rule_key,
  name_zh,
  name_en,
  description_zh,
  description_en,
  required_type_key,
  required_amount,
  reward_type_key,
  reward_amount,
  display_order
)
JOIN custom_reward_types req ON req.type_key = x.required_type_key
JOIN custom_reward_types reward ON reward.type_key = x.reward_type_key
ON CONFLICT (rule_key) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  description_zh = EXCLUDED.description_zh,
  description_en = EXCLUDED.description_en,
  required_reward_type_id = EXCLUDED.required_reward_type_id,
  required_amount = EXCLUDED.required_amount,
  reward_type_id = EXCLUDED.reward_type_id,
  reward_amount = EXCLUDED.reward_amount,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT id, 'zh-TW', name_zh, description_zh
FROM exchange_rules
WHERE rule_key IN ('points_to_money_basic', 'stars_to_diamonds')
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT id, 'en', name_en, description_en
FROM exchange_rules
WHERE rule_key IN ('points_to_money_basic', 'stars_to_diamonds')
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
