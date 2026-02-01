-- ========================================
-- 检查 display_name 字段是否存在
-- 诊断查询：用于验证迁移是否成功
-- ========================================

-- 1. 检查字段是否存在
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'custom_reward_types'
  AND column_name IN ('display_name', 'display_name_zh', 'display_name_en')
ORDER BY column_name;

-- 2. 检查表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'custom_reward_types'
ORDER BY ordinal_position;

-- 3. 如果 display_name 不存在，手动添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'custom_reward_types' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE custom_reward_types 
    ADD COLUMN display_name TEXT;
    
    -- 迁移现有数据
    UPDATE custom_reward_types
    SET display_name = COALESCE(
      NULLIF(TRIM(display_name_zh), ''),
      NULLIF(TRIM(display_name_en), ''),
      'Unnamed Reward Type'
    )
    WHERE display_name IS NULL;
    
    -- 设为 NOT NULL
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name SET NOT NULL;
    
    RAISE NOTICE 'display_name 字段已成功添加并迁移数据';
  ELSE
    RAISE NOTICE 'display_name 字段已存在';
  END IF;
END $$;

-- 4. 将旧字段设为可空（修复 NOT NULL 约束问题）
DO $$
BEGIN
  -- 将 display_name_zh 设为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'custom_reward_types' 
    AND column_name = 'display_name_zh'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name_zh DROP NOT NULL;
    RAISE NOTICE 'display_name_zh 已设为可空';
  END IF;
  
  -- 将 display_name_en 设为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'custom_reward_types' 
    AND column_name = 'display_name_en'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE custom_reward_types
    ALTER COLUMN display_name_en DROP NOT NULL;
    RAISE NOTICE 'display_name_en 已设为可空';
  END IF;
END $$;

-- 5. 验证结果
SELECT 
  id,
  type_key,
  display_name,
  display_name_zh,
  display_name_en,
  icon,
  color
FROM custom_reward_types
ORDER BY created_at
LIMIT 10;
