-- ========================================
-- 添加预设奖励类型：积分、奖金、爱心、星星、钻石
-- 五种皆为不可删除的系统预设类型
-- ========================================
-- 注意：此迁移文件假设 custom_reward_types 表已经存在
-- 如果表不存在，请先执行 add-custom-reward-types-manager.sql
-- ========================================

-- 1. 添加 is_system 字段用于标记系统预设类型
-- ========================================
ALTER TABLE custom_reward_types 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- 添加注释
COMMENT ON COLUMN custom_reward_types.is_system IS '是否为系统预设类型，系统预设类型不可删除';

-- 2. 插入预设的三种奖励类型
-- ========================================

-- 积分（系统预设，不可删除）
-- 注意：如果表中有 display_name 字段，使用 display_name；否则使用 display_name_zh 和 display_name_en
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    -- 使用新的 display_name 字段
    INSERT INTO custom_reward_types (
      type_key, 
      display_name, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'points',
      '積分',
      '⭐',
      '#fbbf24',
      '分',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  ELSE
    -- 使用旧的 display_name_zh 和 display_name_en 字段（向后兼容）
    INSERT INTO custom_reward_types (
      type_key, 
      display_name_zh, 
      display_name_en, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'points',
      '積分',
      'Points',
      '⭐',
      '#fbbf24',
      '分',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

-- 奖金（系统预设，不可删除）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    INSERT INTO custom_reward_types (
      type_key, 
      display_name, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'money',
      '獎金',
      '💰',
      '#10b981',
      '元',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  ELSE
    INSERT INTO custom_reward_types (
      type_key, 
      display_name_zh, 
      display_name_en, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'money',
      '獎金',
      'Money',
      '💰',
      '#10b981',
      '元',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

-- 爱心（系统预设，不可删除）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    INSERT INTO custom_reward_types (
      type_key, 
      display_name, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'hearts',
      '愛心',
      '❤️',
      '#ef4444',
      '顆',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  ELSE
    INSERT INTO custom_reward_types (
      type_key, 
      display_name_zh, 
      display_name_en, 
      icon, 
      color, 
      default_unit, 
      is_accumulable, 
      has_extra_input, 
      extra_input_schema,
      is_system
    )
    VALUES (
      'hearts',
      '愛心',
      'Hearts',
      '❤️',
      '#ef4444',
      '顆',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

-- 星星（系统预设，不可删除）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    INSERT INTO custom_reward_types (
      type_key,
      display_name,
      icon,
      color,
      default_unit,
      is_accumulable,
      has_extra_input,
      extra_input_schema,
      is_system
    )
    VALUES (
      'stars',
      '星星',
      '🌟',
      '#3b82f6',
      '顆',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  ELSE
    INSERT INTO custom_reward_types (
      type_key,
      display_name_zh,
      display_name_en,
      icon,
      color,
      default_unit,
      is_accumulable,
      has_extra_input,
      extra_input_schema,
      is_system
    )
    VALUES (
      'stars',
      '星星',
      'Stars',
      '🌟',
      '#3b82f6',
      'pcs',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

-- 钻石（系统预设，不可删除）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    INSERT INTO custom_reward_types (
      type_key,
      display_name,
      icon,
      color,
      default_unit,
      is_accumulable,
      has_extra_input,
      extra_input_schema,
      is_system
    )
    VALUES (
      'diamonds',
      '鑽石',
      '💎',
      '#8b5cf6',
      '顆',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  ELSE
    INSERT INTO custom_reward_types (
      type_key,
      display_name_zh,
      display_name_en,
      icon,
      color,
      default_unit,
      is_accumulable,
      has_extra_input,
      extra_input_schema,
      is_system
    )
    VALUES (
      'diamonds',
      '鑽石',
      'Diamonds',
      '💎',
      '#8b5cf6',
      'pcs',
      TRUE,
      FALSE,
      NULL,
      TRUE
    )
    ON CONFLICT (type_key) DO UPDATE SET
      display_name_zh = EXCLUDED.display_name_zh,
      display_name_en = EXCLUDED.display_name_en,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      default_unit = EXCLUDED.default_unit,
      is_accumulable = EXCLUDED.is_accumulable,
      has_extra_input = EXCLUDED.has_extra_input,
      extra_input_schema = EXCLUDED.extra_input_schema,
      is_system = TRUE,
      updated_at = NOW();
  END IF;
END $$;

-- 3. 更新 RLS 政策，确保系统预设类型不能被删除
-- ========================================

-- 删除旧的删除政策
DROP POLICY IF EXISTS "Allow delete custom reward types" ON custom_reward_types;

-- 创建新的删除政策，禁止删除系统预设类型
CREATE POLICY "Allow delete custom reward types" 
ON custom_reward_types 
FOR DELETE 
USING (is_system = FALSE);

-- 4. 创建索引以优化查询
-- ========================================
CREATE INDEX IF NOT EXISTS idx_custom_reward_types_is_system 
ON custom_reward_types(is_system);

-- 5. 验证插入结果
-- ========================================
-- 验证插入结果（兼容新旧字段）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' AND column_name = 'display_name'
  ) THEN
    SELECT 
      type_key,
      display_name,
      icon,
      default_unit,
      is_system,
      created_at
    FROM custom_reward_types
    WHERE type_key IN ('points', 'money', 'hearts', 'stars', 'diamonds')
    ORDER BY is_system DESC, type_key;
  ELSE
    SELECT 
      type_key,
      display_name_zh,
      display_name_en,
      icon,
      default_unit,
      is_system,
      created_at
    FROM custom_reward_types
    WHERE type_key IN ('points', 'money', 'hearts', 'stars', 'diamonds')
    ORDER BY is_system DESC, type_key;
  END IF;
END $$;
