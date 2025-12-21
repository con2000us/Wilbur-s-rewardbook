-- 簡單修復獎金規則創建問題
-- 在 Supabase SQL Editor 中執行

-- =====================================
-- 步驟 1：檢查 subject_id 是否存在
-- =====================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

-- 如果上面的結果中沒有看到 'subject_id'，執行下面的語句：

-- =====================================
-- 步驟 2：添加 subject_id 欄位
-- =====================================
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_reward_rules_subject_id ON reward_rules(subject_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_student_id ON reward_rules(student_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_active ON reward_rules(is_active);

-- =====================================
-- 步驟 3：驗證修復
-- =====================================
SELECT 
  '✅ 表結構已更新' as 狀態,
  COUNT(*) as 總欄位數
FROM information_schema.columns
WHERE table_name = 'reward_rules';

-- 查看所有欄位
SELECT 
  column_name as 欄位名稱,
  data_type as 類型
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

