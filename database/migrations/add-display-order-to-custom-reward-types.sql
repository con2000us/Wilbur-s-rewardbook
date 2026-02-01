-- ========================================
-- 為 custom_reward_types 表添加 display_order 欄位
-- 用於排序獎勵類型
-- ========================================

-- 1. 添加 display_order 欄位
ALTER TABLE custom_reward_types
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. 為現有記錄設置初始排序值（基於 created_at）
UPDATE custom_reward_types
SET display_order = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM custom_reward_types
) AS subquery
WHERE custom_reward_types.id = subquery.id AND custom_reward_types.display_order = 0;

-- 3. 創建索引以提高排序查詢性能
CREATE INDEX IF NOT EXISTS idx_custom_reward_types_display_order ON custom_reward_types(display_order);
