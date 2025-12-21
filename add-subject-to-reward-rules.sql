-- 為 reward_rules 表添加 subject_id 字段
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 添加 subject_id 欄位
ALTER TABLE reward_rules 
ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

-- 2. 添加索引以提高查詢性能
CREATE INDEX idx_reward_rules_subject_id ON reward_rules(subject_id);
CREATE INDEX idx_reward_rules_student_id ON reward_rules(student_id);
CREATE INDEX idx_reward_rules_active ON reward_rules(is_active);

-- 3. 添加註釋
COMMENT ON COLUMN reward_rules.subject_id IS '科目ID（NULL表示適用所有科目）';
COMMENT ON COLUMN reward_rules.student_id IS '學生ID（NULL表示適用所有學生）';

-- 4. 查看結果
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reward_rules'
ORDER BY ordinal_position;

-- 成功提示
DO $$
BEGIN
  RAISE NOTICE '✅ reward_rules 表已成功更新！';
  RAISE NOTICE '📝 已添加 subject_id 欄位';
  RAISE NOTICE '🎯 現在可以為不同科目設置不同的獎金規則';
  RAISE NOTICE '';
  RAISE NOTICE '規則匹配優先級：';
  RAISE NOTICE '  1️⃣ 科目 + 學生特定規則（最高優先）';
  RAISE NOTICE '  2️⃣ 科目全局規則';
  RAISE NOTICE '  3️⃣ 學生全局規則';
  RAISE NOTICE '  4️⃣ 全局規則（最低優先）';
END $$;

