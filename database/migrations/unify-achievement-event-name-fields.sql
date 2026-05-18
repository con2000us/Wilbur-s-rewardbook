-- Unify achievement_events name/description fields
-- Drop translation table, rename name_en→name, description_en→description, drop _zh columns

-- 1. Drop translation table
DROP TABLE IF EXISTS achievement_event_translations;

-- 2. Rename name_en to name
ALTER TABLE achievement_events RENAME COLUMN name_en TO name;

-- 3. Drop name_zh
ALTER TABLE achievement_events DROP COLUMN IF EXISTS name_zh;

-- 4. Rename description_en to description
ALTER TABLE achievement_events RENAME COLUMN description_en TO description;

-- 5. Drop description_zh
ALTER TABLE achievement_events DROP COLUMN IF EXISTS description_zh;
