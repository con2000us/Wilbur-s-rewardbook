-- Unify goal_templates name/description fields
-- Rename name_en → name, drop name_zh
-- Rename description_en → description, drop description_zh

-- 1. Rename name_en to name
ALTER TABLE goal_templates RENAME COLUMN name_en TO name;

-- 2. Drop name_zh
ALTER TABLE goal_templates DROP COLUMN IF EXISTS name_zh;

-- 3. Rename description_en to description
ALTER TABLE goal_templates RENAME COLUMN description_en TO description;

-- 4. Drop description_zh
ALTER TABLE goal_templates DROP COLUMN IF EXISTS description_zh;
