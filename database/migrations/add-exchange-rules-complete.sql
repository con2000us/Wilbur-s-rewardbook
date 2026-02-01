-- ========================================
-- 完整的兌換規則表設置
-- Complete Exchange Rules Table Setup
-- ========================================
-- 
-- 執行此文件以創建完整的 exchange_rules 表（包含類型對類型兌換支持）
-- Execute this file to create the complete exchange_rules table (with type-to-type exchange support)
-- ========================================

-- ========================================
-- 步驟 1: 創建 exchange_rules 表
-- Step 1: Create exchange_rules table
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
DROP POLICY IF EXISTS "Allow read access to exchange rules" ON exchange_rules;
CREATE POLICY "Allow read access to exchange rules" ON exchange_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert exchange rules" ON exchange_rules;
CREATE POLICY "Allow insert exchange rules" ON exchange_rules FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update exchange rules" ON exchange_rules;
CREATE POLICY "Allow update exchange rules" ON exchange_rules FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete exchange rules" ON exchange_rules;
CREATE POLICY "Allow delete exchange rules" ON exchange_rules FOR DELETE USING (true);

-- 添加註釋
COMMENT ON TABLE exchange_rules IS '兌換規則表，定義學生可以用獎勵兌換的項目';
COMMENT ON COLUMN exchange_rules.required_reward_type_id IS '需要的獎勵類型ID';
COMMENT ON COLUMN exchange_rules.required_amount IS '兌換所需數量';
COMMENT ON COLUMN exchange_rules.reward_item IS '兌換的獎勵項目描述';

-- ========================================
-- 步驟 2: 添加類型對類型兌換支持
-- Step 2: Add type-to-type exchange support
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

-- ========================================
-- 完成！
-- Complete!
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Exchange rules table setup completed successfully!';
  RAISE NOTICE '📝 The exchange_rules table has been created with type-to-type exchange support.';
END $$;
