-- ========================================
-- 更新兌換規則表以支持類型對類型的兌換
-- ========================================

-- 添加新欄位：兌換得到的獎勵類型
ALTER TABLE exchange_rules 
ADD COLUMN IF NOT EXISTS reward_type_id UUID REFERENCES custom_reward_types(id) ON DELETE CASCADE;

-- 添加新欄位：兌換得到的數量
ALTER TABLE exchange_rules 
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2);

-- 添加註釋
COMMENT ON COLUMN exchange_rules.reward_type_id IS '兌換得到的獎勵類型ID（類型對類型兌換）';
COMMENT ON COLUMN exchange_rules.reward_amount IS '兌換得到的數量（類型對類型兌換）';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_exchange_rules_reward_type_id ON exchange_rules(reward_type_id);
