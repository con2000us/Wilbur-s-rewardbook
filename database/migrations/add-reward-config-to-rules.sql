-- ========================================
-- 为 reward_rules 表添加 reward_config 字段
-- 支持多种奖励类型配置（方案 B）
-- ========================================

-- 1. 添加 reward_config JSONB 字段
-- ========================================
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS reward_config JSONB;

-- 添加注释
COMMENT ON COLUMN reward_rules.reward_config IS '奖励配置数组，支持多种奖励类型。格式：[{"type_id": "uuid", "type_key": "money", "amount": 10, "formula": null, "unit": "元"}]';

-- 2. 向后兼容：将现有的 reward_amount 和 reward_formula 迁移到 reward_config
-- ========================================
DO $$
DECLARE
  rule_record RECORD;
  money_type_id UUID;
  reward_config_array JSONB;
BEGIN
  -- 查找 money 类型的 ID
  SELECT id INTO money_type_id 
  FROM custom_reward_types 
  WHERE type_key = 'money' 
  LIMIT 1;

  -- 如果找到了 money 类型，迁移现有数据
  IF money_type_id IS NOT NULL THEN
    FOR rule_record IN 
      SELECT id, reward_amount, reward_formula 
      FROM reward_rules 
      WHERE reward_config IS NULL 
        AND (reward_amount IS NOT NULL OR reward_formula IS NOT NULL)
    LOOP
      -- 构建 reward_config 数组
      reward_config_array := jsonb_build_array(
        jsonb_build_object(
          'type_id', money_type_id,
          'type_key', 'money',
          'amount', COALESCE(rule_record.reward_amount, 0),
          'formula', rule_record.reward_formula,
          'unit', '元'
        )
      );

      -- 更新 reward_rules 表
      UPDATE reward_rules
      SET reward_config = reward_config_array
      WHERE id = rule_record.id;
    END LOOP;
  END IF;
END $$;

-- 3. 验证迁移结果
-- ========================================
SELECT 
  id,
  rule_name,
  reward_amount,
  reward_formula,
  reward_config
FROM reward_rules
WHERE reward_config IS NOT NULL
LIMIT 5;
