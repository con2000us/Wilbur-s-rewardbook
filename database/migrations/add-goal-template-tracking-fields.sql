-- ========================================
-- 為 goal_templates 新增追蹤相關欄位
-- 1. tracking_reward_type_id：cumulative_amount 模式中要追蹤的獎勵類型
-- 2. tracking_started_at：追蹤起算時間
-- 3. reward_type_id 改為可空（達成獎勵為選填）
-- ========================================

-- 新增追蹤獎勵類型欄位
ALTER TABLE goal_templates
ADD COLUMN IF NOT EXISTS tracking_reward_type_id UUID REFERENCES custom_reward_types(id) ON DELETE SET NULL;

-- 新增追蹤起算時間欄位
ALTER TABLE goal_templates
ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMP WITH TIME ZONE;

-- reward_type_id 改為可空（達成獎勵為選填）
ALTER TABLE goal_templates
ALTER COLUMN reward_type_id DROP NOT NULL;

-- 添加註釋
COMMENT ON COLUMN goal_templates.tracking_reward_type_id IS '累積數量模式中要追蹤的獎勵類型ID';
COMMENT ON COLUMN goal_templates.tracking_started_at IS '追蹤起算時間，null 表示計算所有歷史紀錄';
COMMENT ON COLUMN goal_templates.reward_type_id IS '達成目標後給予的獎勵類型（可為空，代表無額外獎勵）';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_goal_templates_tracking_reward_type_id ON goal_templates(tracking_reward_type_id);
