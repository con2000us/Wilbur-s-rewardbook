-- Make reward_type_id nullable in student_goals
-- 達成目標後不一定會有獎勵回饋（現實中已經帶去實現了），因此 reward_type_id 改為可選

ALTER TABLE student_goals
ALTER COLUMN reward_type_id DROP NOT NULL;

COMMENT ON COLUMN student_goals.reward_type_id IS '完成目標時給予的獎勵類型（可為空，代表無額外獎勵）';
