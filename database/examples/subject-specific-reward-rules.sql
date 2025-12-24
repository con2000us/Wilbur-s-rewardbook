-- 為不同科目設置不同的獎金規則
-- 在 Supabase SQL Editor 中執行此腳本

-- =====================================
-- 步驟 1：查看所有科目
-- =====================================
SELECT 
  s.id,
  s.name as subject_name,
  s.icon,
  st.name as student_name
FROM subjects s
JOIN students st ON s.student_id = st.id
ORDER BY st.name, s.order_index;

-- =====================================
-- 步驟 2：為特定科目設置獎金規則
-- =====================================

-- 範例 1：數學科目獎金（較高）
-- 複製數學科目的 UUID 並替換下面的 '數學科目UUID'
INSERT INTO reward_rules (
  subject_id,
  student_id,
  rule_name,
  description,
  icon,
  color,
  min_score,
  max_score,
  reward_amount,
  priority,
  is_active
) VALUES
  -- 數學滿分：$50
  ('數學科目UUID', NULL, '💎 數學滿分', '數學考試滿分獎勵', '💎', '#FFD700', 100, 100, 50, 20, true),
  -- 數學優秀：$20
  ('數學科目UUID', NULL, '🥇 數學優秀', '數學考試 90+ 分', '🥇', '#C0C0C0', 90, 99.99, 20, 19, true),
  -- 數學良好：$10
  ('數學科目UUID', NULL, '⚙️ 數學良好', '數學考試 80+ 分', '⚙️', '#CD7F32', 80, 89.99, 10, 18, true);

-- 範例 2：國語科目獎金（中等）
-- 複製國語科目的 UUID 並替換下面的 '國語科目UUID'
INSERT INTO reward_rules (
  subject_id,
  student_id,
  rule_name,
  description,
  icon,
  color,
  min_score,
  max_score,
  reward_amount,
  priority,
  is_active
) VALUES
  -- 國語滿分：$30
  ('國語科目UUID', NULL, '📖 國語滿分', '國語考試滿分獎勵', '📖', '#4a9eff', 100, 100, 30, 20, true),
  -- 國語優秀：$10
  ('國語科目UUID', NULL, '✏️ 國語優秀', '國語考試 90+ 分', '✏️', '#6b9eff', 90, 99.99, 10, 19, true),
  -- 國語良好：$5
  ('國語科目UUID', NULL, '📝 國語良好', '國語考試 80+ 分', '📝', '#8ba9ff', 80, 89.99, 5, 18, true);

-- 範例 3：英文科目獎金（較低）
-- 複製英文科目的 UUID 並替換下面的 '英文科目UUID'
INSERT INTO reward_rules (
  subject_id,
  student_id,
  rule_name,
  description,
  icon,
  color,
  min_score,
  max_score,
  reward_amount,
  priority,
  is_active
) VALUES
  -- 英文滿分：$20
  ('英文科目UUID', NULL, '🌍 英文滿分', '英文考試滿分獎勵', '🌍', '#4accff', 100, 100, 20, 20, true),
  -- 英文優秀：$8
  ('英文科目UUID', NULL, '📚 英文優秀', '英文考試 90+ 分', '📚', '#6bccff', 90, 99.99, 8, 19, true),
  -- 英文良好：$4
  ('英文科目UUID', NULL, '✍️ 英文良好', '英文考試 80+ 分', '✍️', '#8bccff', 80, 89.99, 4, 18, true);

-- =====================================
-- 步驟 3：查看創建的規則
-- =====================================
SELECT 
  r.rule_name,
  r.icon,
  s.name as subject_name,
  s.icon as subject_icon,
  st.name as student_name,
  r.min_score || '% - ' || r.max_score || '%' as score_range,
  '$' || r.reward_amount as reward,
  r.priority,
  CASE WHEN r.is_active THEN '✅' ELSE '❌' END as status
FROM reward_rules r
LEFT JOIN subjects s ON r.subject_id = s.id
LEFT JOIN students st ON r.student_id = st.id
ORDER BY s.name, r.priority DESC;

-- =====================================
-- 快速設置腳本（自動化版本）
-- =====================================

-- 如果你想為所有現有科目設置預設規則，執行以下腳本：
DO $$
DECLARE
  subject_record RECORD;
BEGIN
  -- 為每個科目創建基本獎金規則
  FOR subject_record IN 
    SELECT id, name FROM subjects
  LOOP
    -- 插入該科目的獎金規則
    INSERT INTO reward_rules (
      subject_id,
      student_id,
      rule_name,
      icon,
      min_score,
      max_score,
      reward_amount,
      priority,
      is_active
    ) VALUES
      (subject_record.id, NULL, subject_record.name || ' 滿分', '💎', 100, 100, 30, 20, true),
      (subject_record.id, NULL, subject_record.name || ' 優秀', '🥇', 90, 99.99, 10, 19, true),
      (subject_record.id, NULL, subject_record.name || ' 良好', '⚙️', 80, 89.99, 5, 18, true)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ 已為科目 "%" 創建獎金規則', subject_record.name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 所有科目的獎金規則已創建完成！';
END $$;

-- =====================================
-- 進階：為特定學生的特定科目設置特殊規則
-- =====================================

-- 範例：小明的數學特別好，給他更高的數學獎金
-- INSERT INTO reward_rules (
--   subject_id,
--   student_id,
--   rule_name,
--   icon,
--   min_score,
--   max_score,
--   reward_amount,
--   priority,
--   is_active
-- ) VALUES
--   ('數學科目UUID', '小明學生UUID', '小明數學天才獎', '⭐', 95, 100, 100, 30, true);

-- 優先級說明：
-- 30+ : 特定學生 + 特定科目（最高優先）
-- 20-29: 特定科目全局規則
-- 10-19: 特定學生全局規則
-- 0-9  : 全局規則（最低優先）

