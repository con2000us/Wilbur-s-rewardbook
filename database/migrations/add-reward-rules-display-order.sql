-- 為 reward_rules 表添加顯示順序欄位
-- 在 Supabase SQL Editor 中執行此腳本

ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 為現有規則設置初始順序（按優先級和創建時間）
UPDATE reward_rules 
SET display_order = subquery.row_num
FROM (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN student_id IS NOT NULL AND subject_id IS NOT NULL THEN 1  -- 專屬規則
          WHEN student_id IS NULL AND subject_id IS NOT NULL THEN 2      -- 科目規則
          WHEN student_id IS NOT NULL AND subject_id IS NULL THEN 3      -- 學生規則
          ELSE 4                                                          -- 全局規則
        END
      ORDER BY priority DESC, created_at ASC
    ) as row_num
  FROM reward_rules
) AS subquery
WHERE reward_rules.id = subquery.id;

-- 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_reward_rules_display_order ON reward_rules(display_order);

