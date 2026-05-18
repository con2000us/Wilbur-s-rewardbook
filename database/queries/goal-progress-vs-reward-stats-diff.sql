-- Goal progress vs reward-stats diff
-- Purpose:
--   Compare each active cumulative student goal against the reward-stats
--   total-earned transaction set for the same student and reward type.
--
-- Output:
--   reward_stats_only  = counted by reward-stats totalEarned, but not by goal progress
--   goal_progress_only = counted by goal progress, but not by reward-stats totalEarned
--
-- Notes:
--   - This mirrors the app's compatibility matching:
--     direct reward_type_id first, then legacy category/display_name/type_key matching.
--   - Differences caused by tracking_started_at or consumed_by_goal_id are expected.
--   - Run this in Supabase SQL Editor after applying goal-related migrations.

WITH goal_scope AS (
  SELECT
    sg.id AS goal_id,
    sg.student_id,
    s.name AS student_name,
    sg.name AS goal_name,
    COALESCE(sg.tracking_reward_type_id, sg.reward_type_id) AS target_reward_type_id,
    sg.tracking_started_at,
    COALESCE(sg.consume_on_complete, TRUE) AS consume_on_complete
  FROM student_goals sg
  JOIN students s ON s.id = sg.student_id
  WHERE sg.tracking_mode = 'cumulative_amount'
    AND sg.is_active IS DISTINCT FROM FALSE
    AND COALESCE(sg.tracking_reward_type_id, sg.reward_type_id) IS NOT NULL
),
matched_transactions AS (
  SELECT
    g.goal_id,
    g.student_id,
    g.student_name,
    g.goal_name,
    g.target_reward_type_id,
    rt.display_name AS reward_type_name,
    g.tracking_started_at,
    g.consume_on_complete,
    t.id AS transaction_id,
    t.amount,
    t.description,
    t.category,
    t.reward_type_id,
    t.transaction_type,
    t.consumed_by_goal_id,
    COALESCE(t.transaction_date::date, t.created_at::date) AS effective_date
  FROM goal_scope g
  JOIN custom_reward_types rt ON rt.id = g.target_reward_type_id
  JOIN transactions t ON t.student_id = g.student_id
  WHERE t.transaction_type IN ('earn', 'bonus')
    AND (
      t.reward_type_id = rt.id
      OR lower(trim(COALESCE(t.category, ''))) = lower(trim(COALESCE(rt.display_name, '')))
      OR lower(trim(COALESCE(t.category, ''))) = lower(trim(COALESCE(rt.type_key, '')))
      OR (
        lower(trim(COALESCE(rt.type_key, ''))) = 'money'
        OR lower(trim(COALESCE(rt.display_name, ''))) = '獎金'
      )
      AND lower(trim(COALESCE(t.category, ''))) IN (
        '獎金',
        '測驗獎金',
        'money',
        'assessment reward',
        'assessment money'
      )
      OR (
        COALESCE(rt.type_key, '') ~ '^[ -~]+$'
        AND length(trim(COALESCE(rt.type_key, ''))) >= 3
        AND lower(trim(COALESCE(t.category, ''))) LIKE '%' || lower(trim(rt.type_key)) || '%'
      )
    )
),
goal_progress_transactions AS (
  SELECT *
  FROM matched_transactions
  WHERE (tracking_started_at IS NULL OR effective_date >= tracking_started_at::date)
    AND (consume_on_complete = FALSE OR consumed_by_goal_id IS NULL)
),
reward_stats_transactions AS (
  SELECT *
  FROM matched_transactions
  WHERE consumed_by_goal_id IS NULL
),
reward_stats_only AS (
  SELECT rs.*
  FROM reward_stats_transactions rs
  LEFT JOIN goal_progress_transactions gp
    ON gp.goal_id = rs.goal_id
   AND gp.transaction_id = rs.transaction_id
  WHERE gp.transaction_id IS NULL
),
goal_progress_only AS (
  SELECT gp.*
  FROM goal_progress_transactions gp
  LEFT JOIN reward_stats_transactions rs
    ON rs.goal_id = gp.goal_id
   AND rs.transaction_id = gp.transaction_id
  WHERE rs.transaction_id IS NULL
),
diff_rows AS (
  SELECT 'reward_stats_only' AS diff_type, * FROM reward_stats_only
  UNION ALL
  SELECT 'goal_progress_only' AS diff_type, * FROM goal_progress_only
)
SELECT
  diff_type,
  student_id,
  student_name,
  goal_id,
  goal_name,
  target_reward_type_id,
  reward_type_name,
  tracking_started_at,
  consume_on_complete,
  COUNT(*) AS transaction_count,
  SUM(ABS(COALESCE(amount, 0))) AS amount_sum,
  ARRAY_AGG(transaction_id ORDER BY effective_date, transaction_id) AS transaction_ids,
  ARRAY_AGG(
    jsonb_build_object(
      'transaction_id', transaction_id,
      'date', effective_date,
      'amount', amount,
      'type', transaction_type,
      'category', category,
      'description', description,
      'consumed_by_goal_id', consumed_by_goal_id
    )
    ORDER BY effective_date, transaction_id
  ) AS transactions
FROM diff_rows
GROUP BY
  diff_type,
  student_id,
  student_name,
  goal_id,
  goal_name,
  target_reward_type_id,
  reward_type_name,
  tracking_started_at,
  consume_on_complete
ORDER BY student_name, goal_name, diff_type;
