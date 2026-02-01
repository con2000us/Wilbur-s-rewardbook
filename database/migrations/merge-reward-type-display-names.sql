-- ========================================
-- 合并奖励类型显示名称为单一字段
-- 将 display_name_zh 和 display_name_en 合并为 display_name
-- ========================================

-- 1. 检查并添加新的 display_name 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE custom_reward_types 
    ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- 2. 迁移现有数据：优先使用中文名称，如果没有则使用英文名称
DO $$
BEGIN
  -- 如果存在 display_name_zh 字段，则从它迁移
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_zh'
  ) THEN
    UPDATE custom_reward_types
    SET display_name = COALESCE(
      NULLIF(TRIM(display_name_zh), ''),
      NULLIF(TRIM(display_name_en), ''),
      'Unnamed Reward Type'
    )
    WHERE display_name IS NULL;
  -- 如果存在 display_name_en 字段但没有 display_name_zh
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_en'
  ) THEN
    UPDATE custom_reward_types
    SET display_name = COALESCE(
      NULLIF(TRIM(display_name_en), ''),
      'Unnamed Reward Type'
    )
    WHERE display_name IS NULL;
  -- 如果两个字段都不存在，设置默认值
  ELSE
    UPDATE custom_reward_types
    SET display_name = COALESCE(display_name, 'Unnamed Reward Type')
    WHERE display_name IS NULL;
  END IF;
END $$;

-- 3. 确保所有行都有 display_name 值
UPDATE custom_reward_types
SET display_name = COALESCE(display_name, 'Unnamed Reward Type')
WHERE display_name IS NULL;

-- 4. 将 display_name 设为 NOT NULL（在迁移数据后）
DO $$
BEGIN
  -- 检查当前约束
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name SET NOT NULL;
  END IF;
END $$;

-- 5. 添加注释
COMMENT ON COLUMN custom_reward_types.display_name IS '奖励类型显示名称（用户可输入任何语言）';
COMMENT ON COLUMN custom_reward_types.default_unit IS '预设单位（可选，某些语言可能不需要单位）';

-- 6. 将旧字段设为可空（如果它们还存在）
DO $$
BEGIN
  -- 将 display_name_zh 设为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_zh'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name_zh DROP NOT NULL;
  END IF;
  
  -- 将 display_name_en 设为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_en'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name_en DROP NOT NULL;
  END IF;
END $$;

-- 7. 将 default_unit 设为可空（如果还没有）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'default_unit'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN default_unit DROP NOT NULL;
  END IF;
END $$;

-- 8. 验证迁移结果
SELECT 
  id,
  type_key,
  display_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'custom_reward_types' 
      AND column_name = 'display_name_zh'
    ) THEN display_name_zh 
    ELSE NULL 
  END as display_name_zh,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'custom_reward_types' 
      AND column_name = 'display_name_en'
    ) THEN display_name_en 
    ELSE NULL 
  END as display_name_en,
  default_unit
FROM custom_reward_types
ORDER BY created_at;
