-- Bootstrap Step 3: Optional sample data
-- This file is optional. Skip it in production if you want a clean DB.

-- Optional reward rule examples
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
  (NULL, '💎 滿分獎勵', '考試/作業獲得滿分，獲得鑽石獎勵', '💎', '#FFD700', 100, 100, 30, 10, true),
  (NULL, '🥇 優秀獎勵', '分數達到 90-99 分，獲得金錠獎勵', '🥇', '#C0C0C0', 90, 99.99, 10, 9, true),
  (NULL, '⚙️ 良好獎勵', '分數達到 80-89 分，獲得鐵錠獎勵', '⚙️', '#CD7F32', 80, 89.99, 5, 8, true),
  (NULL, '📖 及格獎勵', '分數達到 60-79 分，獲得基本獎勵', '📖', '#4a9eff', 60, 79.99, 2, 7, true),
  (NULL, '❌ 不及格', '分數低於 60 分，無獎金', '❌', '#ff4444', 0, 59.99, 0, 6, true)
ON CONFLICT DO NOTHING;
