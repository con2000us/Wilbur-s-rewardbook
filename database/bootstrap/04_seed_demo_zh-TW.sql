-- Bootstrap Step 4 (optional): zh-TW demo data
-- Includes:
-- 1) Demo achievement event templates
-- 2) Translation rows (zh-TW + en fallback)
-- 3) Default event reward mappings
-- 4) Demo exchange rules + translations

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

CREATE TEMP TABLE bootstrap_demo_achievement_events (
  event_key TEXT PRIMARY KEY,
  zh_name TEXT NOT NULL,
  en_name TEXT NOT NULL,
  zh_description TEXT,
  en_description TEXT,
  reward_type_key TEXT NOT NULL,
  default_amount NUMERIC NOT NULL,
  display_order INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO bootstrap_demo_achievement_events
VALUES
  ('homework_on_time', '作業準時繳交', 'Homework On Time', '準時完成並繳交作業', 'Submit homework on time', 'points', 5::numeric, 1),
  ('self_review', '主動複習', 'Self Review', '主動整理與複習學習內容', 'Take initiative to review', 'stars', 1::numeric, 2),
  ('great_quiz_performance', '小考表現優秀', 'Great Quiz Performance', '小考達到目標分數', 'Reach target score in quiz', 'money', 10::numeric, 3),
  ('active_participation', '課堂積極參與', 'Active Participation', '積極參與課堂活動與討論', 'Actively participate in class', 'hearts', 1::numeric, 4),
  ('help_classmates', '主動幫助同學', 'Help Classmates', '主動協助同學解決問題', 'Help classmates proactively', 'diamonds', 1::numeric, 5);

INSERT INTO achievement_events (event_key, name, description, is_active, display_order)
SELECT event_key, zh_name, zh_description, TRUE, display_order
FROM bootstrap_demo_achievement_events
ON CONFLICT (event_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT e.id, 'zh-TW', x.zh_name, x.zh_description
FROM bootstrap_demo_achievement_events x
JOIN achievement_events e ON e.event_key = x.event_key
ON CONFLICT (event_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT e.id, 'en', x.en_name, x.en_description
FROM bootstrap_demo_achievement_events x
JOIN achievement_events e ON e.event_key = x.event_key
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
FROM bootstrap_demo_achievement_events x
JOIN achievement_events e ON e.event_key = x.event_key
JOIN custom_reward_types rt ON rt.type_key = x.reward_type_key
ON CONFLICT (event_id, reward_type_id) DO UPDATE SET
  default_amount = EXCLUDED.default_amount,
  is_default = EXCLUDED.is_default;

CREATE TEMP TABLE bootstrap_demo_exchange_rules (
  rule_key TEXT PRIMARY KEY,
  zh_name TEXT NOT NULL,
  en_name TEXT NOT NULL,
  zh_description TEXT,
  en_description TEXT,
  required_type_key TEXT NOT NULL,
  required_amount NUMERIC NOT NULL,
  reward_type_key TEXT NOT NULL,
  reward_amount NUMERIC NOT NULL,
  display_order INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO bootstrap_demo_exchange_rules
VALUES
  ('points_to_money_basic', '點數兌換金錢', 'Points to Money', '使用 100 點兌換 10 元', 'Exchange 100 points for 10 money', 'points', 100::numeric, 'money', 10::numeric, 1),
  ('stars_to_diamonds', '星星兌換鑽石', 'Stars to Diamonds', '使用 5 顆星星兌換 1 顆鑽石', 'Exchange 5 stars for 1 diamond', 'stars', 5::numeric, 'diamonds', 1::numeric, 2);

INSERT INTO exchange_rules (
  rule_key,
  name,
  description,
  required_reward_type_id,
  required_amount,
  reward_type_id,
  reward_amount,
  reward_item,
  is_active,
  display_order
)
SELECT
  x.rule_key,
  x.zh_name,
  x.zh_description,
  req.id,
  x.required_amount,
  reward.id,
  x.reward_amount,
  x.zh_description,
  TRUE,
  x.display_order
FROM bootstrap_demo_exchange_rules x
JOIN custom_reward_types req ON req.type_key = x.required_type_key
JOIN custom_reward_types reward ON reward.type_key = x.reward_type_key
ON CONFLICT (rule_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_reward_type_id = EXCLUDED.required_reward_type_id,
  required_amount = EXCLUDED.required_amount,
  reward_type_id = EXCLUDED.reward_type_id,
  reward_amount = EXCLUDED.reward_amount,
  reward_item = EXCLUDED.reward_item,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT r.id, 'zh-TW', x.zh_name, x.zh_description
FROM bootstrap_demo_exchange_rules x
JOIN exchange_rules r ON r.rule_key = x.rule_key
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT r.id, 'en', x.en_name, x.en_description
FROM bootstrap_demo_exchange_rules x
JOIN exchange_rules r ON r.rule_key = x.rule_key
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
