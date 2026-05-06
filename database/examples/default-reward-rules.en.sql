-- Default reward rules (English sample)
-- Run in Supabase SQL Editor to quickly configure baseline reward rules

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
  (NULL, '💎 Perfect Score Reward', 'Get a diamond reward for perfect scores', '💎', '#FFD700', 100, 100, 30, 10, true),
  (NULL, '🥇 Excellent Reward', 'Score 90-99 to receive high-tier rewards', '🥇', '#C0C0C0', 90, 99.99, 10, 9, true),
  (NULL, '⚙️ Good Performance Reward', 'Score 80-89 to receive medium-tier rewards', '⚙️', '#CD7F32', 80, 89.99, 5, 8, true),
  (NULL, '📖 Passing Reward', 'Score 60-79 to receive baseline rewards', '📖', '#4a9eff', 60, 79.99, 2, 7, true),
  (NULL, '❌ No Reward', 'Scores below 60 receive no reward', '❌', '#ff4444', 0, 59.99, 0, 6, true)
ON CONFLICT DO NOTHING;
