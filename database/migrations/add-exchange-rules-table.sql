-- ========================================
-- 創建兌換規則表
-- 用於管理獎勵兌換規則
-- ========================================

CREATE TABLE IF NOT EXISTS exchange_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh TEXT NOT NULL, -- 中文名稱
  name_en TEXT, -- 英文名稱
  description_zh TEXT, -- 中文描述
  description_en TEXT, -- 英文描述
  required_reward_type_id UUID REFERENCES custom_reward_types(id) ON DELETE CASCADE, -- 需要的獎勵類型
  required_amount DECIMAL(10,2) NOT NULL, -- 需要的數量
  reward_item TEXT, -- 兌換的獎勵項目（如：遊樂園通行證、遊戲時間等）
  is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
  display_order INTEGER DEFAULT 0, -- 顯示順序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_exchange_rules_reward_type ON exchange_rules(required_reward_type_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rules_display_order ON exchange_rules(display_order);
CREATE INDEX IF NOT EXISTS idx_exchange_rules_is_active ON exchange_rules(is_active);

-- 啟用 RLS
ALTER TABLE exchange_rules ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Allow read access to exchange rules" ON exchange_rules FOR SELECT USING (true);
CREATE POLICY "Allow insert exchange rules" ON exchange_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update exchange rules" ON exchange_rules FOR UPDATE USING (true);
CREATE POLICY "Allow delete exchange rules" ON exchange_rules FOR DELETE USING (true);

-- 添加註釋
COMMENT ON TABLE exchange_rules IS '兌換規則表，定義學生可以用獎勵兌換的項目';
COMMENT ON COLUMN exchange_rules.required_reward_type_id IS '需要的獎勵類型ID';
COMMENT ON COLUMN exchange_rules.required_amount IS '兌換所需數量';
COMMENT ON COLUMN exchange_rules.reward_item IS '兌換的獎勵項目描述';
