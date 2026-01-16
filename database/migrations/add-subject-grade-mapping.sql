-- Add grade_mapping column to subjects table
-- 新增等級對應欄位到科目表

ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS grade_mapping JSONB DEFAULT NULL;

-- 預設等級對應（可選：為現有科目設定預設值）
-- 格式：{"A+": {"min": 97, "max": 100, "average": 98.5}, "A": {...}, ...}
-- 如果為 NULL，則使用系統預設值
