-- ========================================
-- 將交易記錄的分類標籤從「表現類型」遷移到「獎勵品種類」
-- ========================================
-- 
-- 說明：
-- 1. 此遷移腳本會將現有的 category（表現類型）遷移到新的獎勵品種類系統
-- 2. 建議先備份資料庫再執行
-- 3. 遷移策略：
--    - 保留舊的 category 值在 category_old 欄位（用於參考和回滾）
--    - 將 category 改為對應的獎勵品種類（從 custom_reward_types 選擇）
--    - 如果找不到對應的獎勵品種類，保留原值或設為預設值
--
-- ========================================

-- Step 1: 新增 category_old 欄位用於儲存舊的分類（表現類型）
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_old TEXT;

-- Step 2: 備份現有的 category 到 category_old
UPDATE transactions 
SET category_old = category 
WHERE category_old IS NULL AND category IS NOT NULL;

-- Step 3: 將所有現有交易對應到預設的獎勵品種類
-- 注意：這個映射需要根據實際的 custom_reward_types 資料調整
-- 預設策略：將所有現有的 category（表現類型）對應到預設的獎勵品種類
DO $$
DECLARE
  default_reward_type_name TEXT;
  money_type_key TEXT := 'money';
  points_type_key TEXT := 'points';
BEGIN
  -- 嘗試找到「獎金」或「積分」類型
  SELECT display_name INTO default_reward_type_name
  FROM custom_reward_types
  WHERE type_key = money_type_key OR type_key = points_type_key
  ORDER BY 
    CASE 
      WHEN type_key = money_type_key THEN 1
      WHEN type_key = points_type_key THEN 2
      ELSE 3
    END
  LIMIT 1;
  
  -- 如果找不到，使用第一個可用的獎勵類型
  IF default_reward_type_name IS NULL THEN
    SELECT display_name INTO default_reward_type_name
    FROM custom_reward_types
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- 如果找到預設類型，更新所有交易記錄（除了 reset 類型）
  IF default_reward_type_name IS NOT NULL THEN
    UPDATE transactions
    SET category = default_reward_type_name
    WHERE category IS NOT NULL 
      AND transaction_type != 'reset'
      AND category != default_reward_type_name;
    
    RAISE NOTICE '已將交易記錄的 category 更新為: %', default_reward_type_name;
  ELSE
    RAISE NOTICE '警告：找不到任何獎勵品種類，無法進行自動遷移。請手動設定 category。';
  END IF;
END $$;

-- ========================================
-- 驗證查詢：
-- ========================================
-- 查看遷移前後的對比：
-- SELECT 
--   id,
--   transaction_type,
--   category_old AS "舊分類（表現類型）",
--   category AS "新分類（獎勵品種類）",
--   description,
--   created_at
-- FROM transactions
-- WHERE category_old IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 20;
--
-- ========================================
-- 回滾方案（如果需要）：
-- ========================================
-- 如果遷移後需要回滾，可以執行：
-- UPDATE transactions
-- SET category = category_old
-- WHERE category_old IS NOT NULL;
--
-- ========================================
