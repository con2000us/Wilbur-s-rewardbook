-- 檢查 reward_rules 表結構
-- 在 Supabase SQL Editor 中執行

-- 1. 檢查表是否存在
SELECT 
  '=== 檢查 reward_rules 表結構 ===' as 檢查項目;

SELECT 
  column_name as 欄位名稱,
  data_type as 資料型別,
  is_nullable as 可為空,
  column_default as 預設值
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

-- 2. 檢查是否有 subject_id 欄位
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'reward_rules' 
      AND column_name = 'subject_id'
    ) 
    THEN '✅ subject_id 欄位存在'
    ELSE '❌ subject_id 欄位不存在 - 需要執行遷移腳本！'
  END as 檢查結果;

-- 3. 查看現有的規則
SELECT 
  '=== 現有規則 ===' as 檢查項目;

SELECT 
  id,
  rule_name,
  student_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'reward_rules' 
      AND column_name = 'subject_id'
    ) 
    THEN '(subject_id 欄位存在)'
    ELSE '(subject_id 欄位不存在)'
  END as 狀態
FROM reward_rules
LIMIT 5;

-- 4. 如果 subject_id 不存在，執行以下腳本添加
-- ALTER TABLE reward_rules ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;
-- CREATE INDEX idx_reward_rules_subject_id ON reward_rules(subject_id);

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE '請查看上面的檢查結果：';
  RAISE NOTICE '';
  RAISE NOTICE '如果 subject_id 欄位不存在，請執行：';
  RAISE NOTICE 'ALTER TABLE reward_rules ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;';
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
END $$;

