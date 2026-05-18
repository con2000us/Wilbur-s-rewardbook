-- Update student_goals for completion system v2
-- Adds: status, completed_at, completion_notes, completion_images, tracking_started_at, linked_event_ids
-- Adds consumed_by_goal_id to transactions

-- === 追蹤模式說明 (tracking_mode) ===
--
-- cumulative_amount (累積金額型):
--   追蹤學生的累積金額進度，當 current_progress 達到 target_amount 時視為完成。
--   適用場景：存錢目標、募款目標等需要累積金額的大目標。
--   - target_amount: 設定目標金額 (NUMERIC)
--   - target_count: 不使用 (NULL)
--
-- completion_count (完成次數型):
--   追蹤學生的完成次數進度，當 current_progress 達到 target_count 時視為完成。
--   適用場景：閱讀 N 本書、完成 N 項任務等以次數計數的大目標。
--   - target_amount: 不使用 (NULL)
--   - target_count: 設定目標次數 (INTEGER)

-- === student_goals new columns ===

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed'));

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS completion_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS linked_event_ids JSONB DEFAULT '[]'::jsonb;

-- === Indexes for student_goals ===

CREATE INDEX IF NOT EXISTS idx_student_goals_status ON student_goals(status);
CREATE INDEX IF NOT EXISTS idx_student_goals_tracking_started_at ON student_goals(tracking_started_at);

-- === transactions: consumed_by_goal_id ===

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS consumed_by_goal_id UUID REFERENCES student_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_consumed_by_goal_id ON transactions(consumed_by_goal_id);
