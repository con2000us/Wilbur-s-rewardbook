-- ============================================
-- Wilbur's Reward Book - Complete Database Setup
-- 完整的資料庫設置腳本
-- ============================================
-- 
-- Execute this file in Supabase SQL Editor to set up the entire database.
-- 在 Supabase SQL Editor 中執行此文件以設置整個資料庫。
--
-- This script includes all necessary migrations in the correct order.
-- 此腳本包含所有必要的遷移，按正確順序執行。
-- ============================================

-- ============================================
-- Step 1: Create update_updated_at_column() function (if not exists)
-- 步驟 1: 創建更新時間觸發器函數（如果不存在）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 2: Create site_settings table
-- 步驟 2: 創建網站設定表
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update trigger for site_settings
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at 
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert" ON site_settings;
CREATE POLICY "Allow insert" ON site_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update" ON site_settings;
CREATE POLICY "Allow update" ON site_settings FOR UPDATE USING (true);

-- Insert default site name
INSERT INTO site_settings (key, value) VALUES 
  ('site_name', 'Wilbur''s RewardBook')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Step 3: Add display_order to students table
-- 步驟 3: 為學生表添加顯示順序欄位
-- ============================================
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial order for existing students (by creation time)
UPDATE students 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM students
) AS subquery
WHERE students.id = subquery.id AND students.display_order = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_display_order ON students(display_order);

-- ============================================
-- Step 4: Add subject_id to reward_rules table
-- 步驟 4: 為獎勵規則表添加科目ID欄位
-- ============================================
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reward_rules_subject_id ON reward_rules(subject_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_student_id ON reward_rules(student_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_active ON reward_rules(is_active);

-- Add comments
COMMENT ON COLUMN reward_rules.subject_id IS '科目ID（NULL表示適用所有科目）';
COMMENT ON COLUMN reward_rules.student_id IS '學生ID（NULL表示適用所有學生）';

-- ============================================
-- Step 5: Add display_order to reward_rules table
-- 步驟 5: 為獎勵規則表添加顯示順序欄位
-- ============================================
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial order for existing rules (by priority and creation time)
UPDATE reward_rules 
SET display_order = subquery.row_num
FROM (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN student_id IS NOT NULL AND subject_id IS NOT NULL THEN 1  -- 專屬規則
          WHEN student_id IS NULL AND subject_id IS NOT NULL THEN 2      -- 科目規則
          WHEN student_id IS NOT NULL AND subject_id IS NULL THEN 3      -- 學生規則
          ELSE 4                                                          -- 全局規則
        END
      ORDER BY priority DESC, created_at ASC
    ) as row_num
  FROM reward_rules
) AS subquery
WHERE reward_rules.id = subquery.id AND reward_rules.display_order = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reward_rules_display_order ON reward_rules(display_order);

-- ============================================
-- Step 6: Add 'reset' transaction type
-- 步驟 6: 添加 'reset' 交易類型
-- ============================================
-- Drop old CHECK constraint if exists
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add new CHECK constraint (including 'reset')
ALTER TABLE transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('earn', 'spend', 'bonus', 'penalty', 'reset'));

-- ============================================
-- Step 7: Add pagination settings
-- 步驟 7: 添加分頁設定
-- ============================================
INSERT INTO site_settings (key, value, created_at, updated_at)
VALUES ('items_per_page', '25', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Step 8: Create backups table
-- 步驟 8: 創建備份表
-- ============================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  backup_data JSONB NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update trigger for backups
DROP TRIGGER IF EXISTS update_backups_updated_at ON backups;
CREATE TRIGGER update_backups_updated_at 
BEFORE UPDATE ON backups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_name ON backups(name);

-- Enable RLS
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access" ON backups;
CREATE POLICY "Allow public read access" ON backups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert" ON backups;
CREATE POLICY "Allow insert" ON backups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update" ON backups;
CREATE POLICY "Allow update" ON backups FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete" ON backups;
CREATE POLICY "Allow delete" ON backups FOR DELETE USING (true);

-- ============================================
-- Setup Complete!
-- 設置完成！
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📝 All tables and configurations have been created.';
  RAISE NOTICE '🎯 You can now start using the application.';
END $$;

