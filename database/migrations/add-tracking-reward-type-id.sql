-- Add tracking_reward_type_id to student_goals
-- Separates "which reward type to track" from "which reward to give on completion"
-- This resolves the issue where cumulative_amount mode had no clear way to select which reward type to accumulate

-- 1. Add the new column (nullable initially to support backfill)
ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS tracking_reward_type_id UUID REFERENCES custom_reward_types(id) ON DELETE SET NULL;

-- 2. Backfill: for existing cumulative_amount goals, copy reward_type_id to tracking_reward_type_id
UPDATE student_goals
SET tracking_reward_type_id = reward_type_id
WHERE tracking_mode = 'cumulative_amount'
  AND tracking_reward_type_id IS NULL;

-- 3. For completion_count goals, tracking_reward_type_id stays NULL (they track events, not rewards)

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_student_goals_tracking_reward_type_id
ON student_goals(tracking_reward_type_id);
