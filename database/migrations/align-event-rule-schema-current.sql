-- Align achievement events and exchange rules with the current application schema.
-- This is a one-time migration for databases that still have
-- name_zh/name_en/description_zh/description_en on the main tables.

BEGIN;

ALTER TABLE achievement_events ADD COLUMN IF NOT EXISTS event_key TEXT;
ALTER TABLE achievement_events ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE achievement_events ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
DECLARE
  has_name_zh BOOLEAN;
  has_name_en BOOLEAN;
  has_description_zh BOOLEAN;
  has_description_en BOOLEAN;
  name_expr TEXT := 'NULLIF(name, '''')';
  description_expr TEXT := 'description';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'name_zh'
  ) INTO has_name_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'name_en'
  ) INTO has_name_en;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'description_zh'
  ) INTO has_description_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'description_en'
  ) INTO has_description_en;

  IF has_name_zh THEN
    name_expr := name_expr || ', NULLIF(name_zh, '''')';
  END IF;

  IF has_name_en THEN
    name_expr := name_expr || ', NULLIF(name_en, '''')';
  END IF;

  IF has_description_zh THEN
    description_expr := description_expr || ', description_zh';
  END IF;

  IF has_description_en THEN
    description_expr := description_expr || ', description_en';
  END IF;

  EXECUTE format('UPDATE achievement_events SET name = COALESCE(%s, ''Event'')', name_expr);
  EXECUTE format('UPDATE achievement_events SET description = COALESCE(%s)', description_expr);
END $$;

UPDATE achievement_events
SET event_key = regexp_replace(
  lower(coalesce(nullif(trim(event_key), ''), nullif(trim(name), ''), 'event')),
  '[^a-z0-9]+',
  '_',
  'g'
)
WHERE event_key IS NULL OR trim(event_key) = '';

UPDATE achievement_events
SET event_key = trim(both '_' FROM event_key)
WHERE event_key IS NOT NULL;

UPDATE achievement_events
SET event_key = 'event_' || substr(id::text, 1, 8)
WHERE event_key IS NULL OR event_key = '';

WITH duplicated_keys AS (
  SELECT event_key
  FROM achievement_events
  GROUP BY event_key
  HAVING count(*) > 1
)
UPDATE achievement_events e
SET event_key = e.event_key || '_' || substr(e.id::text, 1, 8)
FROM duplicated_keys d
WHERE e.event_key = d.event_key;

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

CREATE INDEX IF NOT EXISTS idx_achievement_event_translations_event_id
ON achievement_event_translations(event_id);

CREATE INDEX IF NOT EXISTS idx_achievement_event_translations_locale
ON achievement_event_translations(locale);

DROP TRIGGER IF EXISTS update_achievement_event_translations_updated_at ON achievement_event_translations;
CREATE TRIGGER update_achievement_event_translations_updated_at
BEFORE UPDATE ON achievement_event_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
  has_name_zh BOOLEAN;
  has_name_en BOOLEAN;
  has_description_zh BOOLEAN;
  has_description_en BOOLEAN;
  zh_name_expr TEXT := 'name';
  en_name_expr TEXT := 'name';
  zh_description_expr TEXT := 'description';
  en_description_expr TEXT := 'description';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'name_zh'
  ) INTO has_name_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'name_en'
  ) INTO has_name_en;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'description_zh'
  ) INTO has_description_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_events' AND column_name = 'description_en'
  ) INTO has_description_en;

  IF has_name_zh THEN
    zh_name_expr := 'COALESCE(NULLIF(name_zh, ''''), name)';
  END IF;

  IF has_name_en THEN
    en_name_expr := 'COALESCE(NULLIF(name_en, ''''), name)';
  END IF;

  IF has_description_zh THEN
    zh_description_expr := 'COALESCE(description_zh, description)';
  END IF;

  IF has_description_en THEN
    en_description_expr := 'COALESCE(description_en, description)';
  END IF;

  EXECUTE format(
    'INSERT INTO achievement_event_translations (event_id, locale, name, description)
     SELECT id, ''zh-TW'', %s, %s FROM achievement_events
     ON CONFLICT (event_id, locale) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       updated_at = NOW()',
    zh_name_expr,
    zh_description_expr
  );

  EXECUTE format(
    'INSERT INTO achievement_event_translations (event_id, locale, name, description)
     SELECT id, ''en'', %s, %s FROM achievement_events
     ON CONFLICT (event_id, locale) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       updated_at = NOW()',
    en_name_expr,
    en_description_expr
  );
END $$;

ALTER TABLE achievement_events ALTER COLUMN name SET NOT NULL;
ALTER TABLE achievement_events DROP COLUMN IF EXISTS name_zh;
ALTER TABLE achievement_events DROP COLUMN IF EXISTS name_en;
ALTER TABLE achievement_events DROP COLUMN IF EXISTS description_zh;
ALTER TABLE achievement_events DROP COLUMN IF EXISTS description_en;

ALTER TABLE exchange_rules ADD COLUMN IF NOT EXISTS rule_key TEXT;
ALTER TABLE exchange_rules ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE exchange_rules ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
DECLARE
  has_name_zh BOOLEAN;
  has_name_en BOOLEAN;
  has_description_zh BOOLEAN;
  has_description_en BOOLEAN;
  name_expr TEXT := 'NULLIF(name, '''')';
  description_expr TEXT := 'description';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'name_zh'
  ) INTO has_name_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'name_en'
  ) INTO has_name_en;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'description_zh'
  ) INTO has_description_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'description_en'
  ) INTO has_description_en;

  IF has_name_zh THEN
    name_expr := name_expr || ', NULLIF(name_zh, '''')';
  END IF;

  IF has_name_en THEN
    name_expr := name_expr || ', NULLIF(name_en, '''')';
  END IF;

  IF has_description_zh THEN
    description_expr := description_expr || ', description_zh';
  END IF;

  IF has_description_en THEN
    description_expr := description_expr || ', description_en';
  END IF;

  EXECUTE format('UPDATE exchange_rules SET name = COALESCE(%s, ''Exchange Rule'')', name_expr);
  EXECUTE format('UPDATE exchange_rules SET description = COALESCE(%s)', description_expr);
END $$;

UPDATE exchange_rules
SET rule_key = regexp_replace(
  lower(coalesce(nullif(trim(rule_key), ''), nullif(trim(name), ''), 'exchange_rule')),
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

DO $$
DECLARE
  has_name_zh BOOLEAN;
  has_name_en BOOLEAN;
  has_description_zh BOOLEAN;
  has_description_en BOOLEAN;
  zh_name_expr TEXT := 'name';
  en_name_expr TEXT := 'name';
  zh_description_expr TEXT := 'description';
  en_description_expr TEXT := 'description';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'name_zh'
  ) INTO has_name_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'name_en'
  ) INTO has_name_en;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'description_zh'
  ) INTO has_description_zh;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_rules' AND column_name = 'description_en'
  ) INTO has_description_en;

  IF has_name_zh THEN
    zh_name_expr := 'COALESCE(NULLIF(name_zh, ''''), name)';
  END IF;

  IF has_name_en THEN
    en_name_expr := 'COALESCE(NULLIF(name_en, ''''), name)';
  END IF;

  IF has_description_zh THEN
    zh_description_expr := 'COALESCE(description_zh, description)';
  END IF;

  IF has_description_en THEN
    en_description_expr := 'COALESCE(description_en, description)';
  END IF;

  EXECUTE format(
    'INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
     SELECT id, ''zh-TW'', %s, %s FROM exchange_rules
     ON CONFLICT (rule_id, locale) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       updated_at = NOW()',
    zh_name_expr,
    zh_description_expr
  );

  EXECUTE format(
    'INSERT INTO exchange_rule_translations (rule_id, locale, name, description)
     SELECT id, ''en'', %s, %s FROM exchange_rules
     ON CONFLICT (rule_id, locale) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       updated_at = NOW()',
    en_name_expr,
    en_description_expr
  );
END $$;

ALTER TABLE exchange_rules ALTER COLUMN name SET NOT NULL;
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS name_zh;
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS name_en;
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS description_zh;
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS description_en;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE achievement_event_translations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exchange_rule_translations TO anon, authenticated;

COMMIT;
