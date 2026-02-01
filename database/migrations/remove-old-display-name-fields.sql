-- ========================================
-- 删除旧的 display_name_zh 和 display_name_en 字段
-- 可选迁移：如果确定不再需要旧字段，可以运行此迁移
-- ========================================
-- 
-- 注意：此迁移会永久删除 display_name_zh 和 display_name_en 字段
-- 请确保：
-- 1. 所有数据已迁移到 display_name 字段
-- 2. 没有其他代码依赖这些旧字段
-- 3. 已备份数据库
-- ========================================

-- 1. 确保所有数据都已迁移到 display_name
-- 如果 display_name 为空，从旧字段迁移
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_zh'
  ) THEN
    UPDATE custom_reward_types
    SET display_name = COALESCE(
      NULLIF(TRIM(display_name), ''),
      NULLIF(TRIM(display_name_zh), ''),
      NULLIF(TRIM(display_name_en), ''),
      'Unnamed Reward Type'
    )
    WHERE display_name IS NULL OR TRIM(display_name) = '';
  END IF;
END $$;

-- 2. 删除 display_name_zh 字段（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_zh'
  ) THEN
    ALTER TABLE custom_reward_types
    DROP COLUMN display_name_zh;
    RAISE NOTICE '已删除 display_name_zh 字段';
  ELSE
    RAISE NOTICE 'display_name_zh 字段不存在，跳过';
  END IF;
END $$;

-- 3. 删除 display_name_en 字段（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_reward_types' 
    AND column_name = 'display_name_en'
  ) THEN
    ALTER TABLE custom_reward_types
    DROP COLUMN display_name_en;
    RAISE NOTICE '已删除 display_name_en 字段';
  ELSE
    RAISE NOTICE 'display_name_en 字段不存在，跳过';
  END IF;
END $$;

-- 4. 验证结果
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'custom_reward_types'
  AND column_name LIKE 'display_name%'
ORDER BY column_name;

-- 5. 显示当前数据（确认迁移成功）
SELECT 
  id,
  type_key,
  display_name,
  icon,
  color
FROM custom_reward_types
ORDER BY created_at
LIMIT 10;
