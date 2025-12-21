-- 修復獎金規則創建錯誤
-- 在 Supabase SQL Editor 中執行

-- =====================================
-- 步驟 1：檢查問題
-- =====================================
SELECT '========== 步驟 1：檢查 subject_id 是否存在 ==========' as 步驟;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

-- =====================================
-- 步驟 2：添加 subject_id 欄位（如果不存在）
-- =====================================
SELECT '========== 步驟 2：添加 subject_id 欄位 ==========' as 步驟;

-- 檢查並添加 subject_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'reward_rules' 
    AND column_name = 'subject_id'
  ) THEN
    -- 添加欄位
    ALTER TABLE reward_rules 
    ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;
    
    -- 添加索引
    CREATE INDEX idx_reward_rules_subject_id ON reward_rules(subject_id);
    
    RAISE NOTICE '✅ subject_id 欄位已添加';
  ELSE
    RAISE NOTICE '✅ subject_id 欄位已存在';
  END IF;
END $$;

-- =====================================
-- 步驟 3：檢查其他可能缺少的索引
-- =====================================
SELECT '========== 步驟 3：添加索引 ==========' as 步驟;

-- 添加 student_id 索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_reward_rules_student_id ON reward_rules(student_id);

-- 添加 is_active 索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_reward_rules_active ON reward_rules(is_active);

-- =====================================
-- 步驟 4：驗證表結構
-- =====================================
SELECT '========== 步驟 4：驗證最終表結構 ==========' as 步驟;

SELECT 
  column_name as 欄位,
  data_type as 類型,
  is_nullable as 可空,
  column_default as 預設值
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

-- =====================================
-- 步驟 5：測試創建規則
-- =====================================
SELECT '========== 步驟 5：測試創建規則 ==========' as 步驟;

-- 先查看學生和科目
SELECT 
  st.id as student_id,
  st.name as student_name,
  s.id as subject_id,
  s.name as subject_name
FROM students st
LEFT JOIN subjects s ON st.id = s.student_id
LIMIT 3;

-- 測試插入一條規則（使用全局規則，不指定學生和科目）
INSERT INTO reward_rules (
  student_id,
  subject_id,
  rule_name,
  description,
  icon,
  color,
  min_score,
  max_score,
  reward_amount,
  priority,
  is_active
) VALUES (
  NULL,  -- 全局學生
  NULL,  -- 全局科目
  '測試規則',
  '這是一個測試規則',
  '🧪',
  '#ff0000',
  90,
  100,
  10,
  0,
  true
)
ON CONFLICT DO NOTHING
RETURNING id, rule_name;

-- 如果測試成功，刪除測試規則
DELETE FROM reward_rules WHERE rule_name = '測試規則';

-- =====================================
-- 完成
-- =====================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ 修復完成！';
  RAISE NOTICE '';
  RAISE NOTICE '請檢查步驟 5 的測試結果：';
  RAISE NOTICE '  - 如果顯示 "測試規則"，表示創建成功';
  RAISE NOTICE '  - 現在可以在網頁上添加獎金規則了';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 重要：請重啟 Next.js 開發服務器';
  RAISE NOTICE '   在終端按 Ctrl+C，然後執行 npm run dev';
  RAISE NOTICE '======================================';
END $$;

