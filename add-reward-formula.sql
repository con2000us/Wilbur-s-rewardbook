-- Add reward_formula to reward_rules table
-- 為 reward_rules 新增 reward_formula 欄位（支援用變數計算獎金）

ALTER TABLE reward_rules
ADD COLUMN IF NOT EXISTS reward_formula TEXT;

COMMENT ON COLUMN reward_rules.reward_formula IS
'Reward formula. Variables: G=score, P=percentage, M=max_score. Example: G*10';


