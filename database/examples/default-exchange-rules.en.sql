-- Default exchange rules (en)
-- Canonical key + translation table flow

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
    ('points_to_money_basic', 'Points to Money', 'Points to Money', 'Exchange 100 points for 10 money', 'Exchange 100 points for 10 money', 'points', 100::numeric, 'money', 10::numeric, 1),
    ('stars_to_diamonds', 'Stars to Diamonds', 'Stars to Diamonds', 'Exchange 5 stars for 1 diamond', 'Exchange 5 stars for 1 diamond', 'stars', 5::numeric, 'diamonds', 1::numeric, 2)
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
SELECT id, 'en', name_en, description_en
FROM exchange_rules
WHERE rule_key IN ('points_to_money_basic', 'stars_to_diamonds')
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT id, 'zh-TW', name_zh, description_zh
FROM exchange_rules
WHERE rule_key IN ('points_to_money_basic', 'stars_to_diamonds')
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
