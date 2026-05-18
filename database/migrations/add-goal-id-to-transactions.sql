-- Link generated goal completion/refund transactions back to the student goal.
-- Code remains backward compatible when this migration has not been applied yet.

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES student_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id);

COMMENT ON COLUMN transactions.goal_id IS 'Student goal that generated this transaction, used for precise reset/undo cleanup';
