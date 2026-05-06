-- Canonical key + translation layer for achievement events
-- 1) Add stable event_key to achievement_events
-- 2) Add translation table achievement_event_translations
-- 3) Backfill existing zh/en fields into translation rows

ALTER TABLE achievement_events
ADD COLUMN IF NOT EXISTS event_key TEXT;

UPDATE achievement_events
SET event_key = regexp_replace(
  lower(
    coalesce(
      nullif(trim(name_en), ''),
      nullif(trim(name_zh), ''),
      'event'
    )
  ),
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

ALTER TABLE achievement_events
ALTER COLUMN event_key SET NOT NULL;

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

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT
  id,
  'zh-TW',
  name_zh,
  description_zh
FROM achievement_events
WHERE nullif(trim(name_zh), '') IS NOT NULL
ON CONFLICT (event_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO achievement_event_translations (event_id, locale, name, description)
SELECT
  id,
  'en',
  name_en,
  description_en
FROM achievement_events
WHERE nullif(trim(name_en), '') IS NOT NULL
ON CONFLICT (event_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
