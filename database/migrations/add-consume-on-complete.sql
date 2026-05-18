-- ========================================
-- 新增 consume_on_complete 欄位
-- true  = 一般目標：完成時消耗交易
-- false = 里程碑目標：完成不消耗，進度不排除已消耗交易
-- ========================================

-- student_goals
ALTER TABLE student_goals
ADD COLUMN IF NOT EXISTS consume_on_complete BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN student_goals.consume_on_complete IS '完成時是否消耗交易。false 時為里程碑模式：進度計算不限 consumed_by_goal_id，完成不消耗';

-- goal_templates
ALTER TABLE goal_templates
ADD COLUMN IF NOT EXISTS consume_on_complete BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN goal_templates.consume_on_complete IS '完成時是否消耗交易。false 時為里程碑模式：進度計算不限 consumed_by_goal_id，完成不消耗';
