-- Unify custom_reward_types display name fields
-- Drop display_name_zh and display_name_en if they still exist

-- 1. Ensure display_name exists and is populated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_reward_types'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE custom_reward_types ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- 2. Migrate any remaining data from zh/en to display_name
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
      NULLIF(TRIM(display_name_en), ''),
      NULLIF(TRIM(display_name_zh), ''),
      'Unnamed Reward Type'
    )
    WHERE display_name IS NULL OR TRIM(display_name) = '';
  END IF;
END $$;

-- 3. Set display_name NOT NULL
ALTER TABLE custom_reward_types ALTER COLUMN display_name SET NOT NULL;

-- 4. Drop display_name_zh
ALTER TABLE custom_reward_types DROP COLUMN IF EXISTS display_name_zh;

-- 5. Drop display_name_en
ALTER TABLE custom_reward_types DROP COLUMN IF EXISTS display_name_en;
