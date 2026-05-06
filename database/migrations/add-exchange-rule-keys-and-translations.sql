-- Canonical key + translation layer for exchange rules
-- 1) Add stable rule_key to exchange_rules
-- 2) Add translation table exchange_rule_translations
-- 3) Backfill existing zh/en fields into translation rows

ALTER TABLE exchange_rules
ADD COLUMN IF NOT EXISTS rule_key TEXT;

UPDATE exchange_rules
SET rule_key = regexp_replace(
  lower(
    coalesce(
      nullif(trim(name_en), ''),
      nullif(trim(name_zh), ''),
      'exchange_rule'
    )
  ),
  '[^a-z0-9]+',
  '_',
  'g'
)
WHERE rule_key IS NULL OR trim(rule_key) = '';

UPDATE exchange_rules
SET rule_key = trim(both '_' FROM rule_key)
WHERE rule_key IS NOT NULL;

UPDATE exchange_rules
SET rule_key = 'exchange_rule_' || substr(id::text, 1, 8)
WHERE rule_key IS NULL OR rule_key = '';

WITH duplicated_keys AS (
  SELECT rule_key
  FROM exchange_rules
  GROUP BY rule_key
  HAVING count(*) > 1
)
UPDATE exchange_rules er
SET rule_key = er.rule_key || '_' || substr(er.id::text, 1, 8)
FROM duplicated_keys dk
WHERE er.rule_key = dk.rule_key;

ALTER TABLE exchange_rules
ALTER COLUMN rule_key SET NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_exchange_rule_translations_rule_id
ON exchange_rule_translations(rule_id);

CREATE INDEX IF NOT EXISTS idx_exchange_rule_translations_locale
ON exchange_rule_translations(locale);

DROP TRIGGER IF EXISTS update_exchange_rule_translations_updated_at ON exchange_rule_translations;
CREATE TRIGGER update_exchange_rule_translations_updated_at
BEFORE UPDATE ON exchange_rule_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT
  id,
  'zh-TW',
  name_zh,
  description_zh
FROM exchange_rules
WHERE nullif(trim(name_zh), '') IS NOT NULL
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
SELECT
  id,
  'en',
  name_en,
  description_en
FROM exchange_rules
WHERE nullif(trim(name_en), '') IS NOT NULL
ON CONFLICT (rule_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
