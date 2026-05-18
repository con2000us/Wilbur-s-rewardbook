-- Unify exchange_rules name/description fields
-- Drop translation table, rename name_en→name, description_en→description, drop _zh columns

-- 1. Drop translation table
DROP TABLE IF EXISTS exchange_rule_translations;

-- 2. Rename name_en to name
ALTER TABLE exchange_rules RENAME COLUMN name_en TO name;

-- 3. Drop name_zh
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS name_zh;

-- 4. Rename description_en to description
ALTER TABLE exchange_rules RENAME COLUMN description_en TO description;

-- 5. Drop description_zh
ALTER TABLE exchange_rules DROP COLUMN IF EXISTS description_zh;
