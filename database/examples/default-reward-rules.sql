-- 預設獎金規則
-- 在 Supabase SQL Editor 中執行此腳本來快速設置獎金規則

-- 清除現有規則（可選，如果要重新設置）
-- DELETE FROM reward_rules;

-- 添加全局獎金規則
INSERT INTO reward_rules (
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
  -- 滿分獎勵（最高優先級）
  (NULL, '💎 滿分獎勵', '考試/作業獲得滿分，獲得鑽石獎勵', '💎', '#FFD700', 100, 100, 30, 10, true),
  
  -- 優秀獎勵
  (NULL, '🥇 優秀獎勵', '分數達到 90-99 分，獲得金錠獎勵', '🥇', '#C0C0C0', 90, 99.99, 10, 9, true),
  
  -- 良好獎勵
  (NULL, '⚙️ 良好獎勵', '分數達到 80-89 分，獲得鐵錠獎勵', '⚙️', '#CD7F32', 80, 89.99, 5, 8, true),
  
  -- 及格獎勵
  (NULL, '📖 及格獎勵', '分數達到 60-79 分，獲得基本獎勵', '📖', '#4a9eff', 60, 79.99, 2, 7, true),
  
  -- 不及格（無獎金）
  (NULL, '❌ 不及格', '分數低於 60 分，無獎金', '❌', '#ff4444', 0, 59.99, 0, 6, true)
ON CONFLICT DO NOTHING;

-- 查看創建的規則
SELECT 
  rule_name,
  icon,
  min_score || '% - ' || max_score || '%' as score_range,
  '$' || reward_amount as reward,
  priority,
  CASE WHEN student_id IS NULL THEN '🌍 全局' ELSE '👤 個人' END as scope,
  CASE WHEN is_active THEN '✅ 啟用' ELSE '❌ 停用' END as status
FROM reward_rules
ORDER BY priority DESC;

-- 成功提示
DO $$
BEGIN
  RAISE NOTICE '✅ 獎金規則已成功創建！';
  RAISE NOTICE '📝 共創建了 5 條全局規則';
  RAISE NOTICE '🎯 現在添加評量時會自動根據規則計算獎金';
END $$;

