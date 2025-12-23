-- ============================================
-- Wilbur's Reward Book - Complete Database Setup
-- 完整的資料庫設置腳本
-- ============================================
-- 
-- Execute this file in Supabase SQL Editor to set up the entire database.
-- 在 Supabase SQL Editor 中執行此文件以設置整個資料庫。
--
-- This script creates all tables and applies all migrations in the correct order.
-- 此腳本創建所有表並按正確順序應用所有遷移。
-- ============================================

-- ============================================
-- PART 1: Create Core Tables
-- 第一部分：創建核心表
-- ============================================

-- Step 1: Create update_updated_at_column() function
-- 步驟 1: 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create students table
-- 步驟 2: 創建學生表
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create subjects table
-- 步驟 3: 創建科目表
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4a9eff',
  icon TEXT DEFAULT '📚',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create assessments table
-- 步驟 4: 創建評量表
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT CHECK (assessment_type IN ('exam', 'homework', 'quiz', 'project')),
  score DECIMAL(5,2),
  max_score DECIMAL(5,2) DEFAULT 100,
  percentage DECIMAL(5,2),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  penalty_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('upcoming', 'completed', 'graded')) DEFAULT 'upcoming',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create transactions table
-- 步驟 5: 創建交易表
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  transaction_type TEXT CHECK (transaction_type IN ('earn', 'spend', 'bonus', 'penalty', 'reset')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create reward_rules table
-- 步驟 6: 創建獎勵規則表
CREATE TABLE IF NOT EXISTS reward_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💎',
  color TEXT DEFAULT '#4a9eff',
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  condition TEXT CHECK (condition IN ('score_equals', 'score_range', 'perfect_score')),
  assessment_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: Create Triggers
-- 第二部分：創建觸發器
-- ============================================

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at 
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at 
BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: Create Views
-- 第三部分：創建視圖
-- ============================================

-- Create student_summary view
DROP VIEW IF EXISTS student_summary;
CREATE VIEW student_summary AS
SELECT 
  s.id as student_id,
  s.name,
  (SELECT COUNT(DISTINCT id) FROM subjects WHERE student_id = s.id) as total_subjects,
  (SELECT COUNT(DISTINCT a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
  ) as total_assessments,
  (SELECT COUNT(DISTINCT a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
     AND a.status = 'completed'
  ) as completed_assessments,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id AND amount > 0), 0) as total_earned,
  COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE student_id = s.id AND amount < 0), 0) as total_spent,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id), 0) as balance
FROM students s;

-- ============================================
-- PART 4: Create Indexes
-- 第四部分：創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subjects_student_id ON subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject_id ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_due_date ON assessments(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_assessment_id ON transactions(assessment_id);

-- ============================================
-- PART 5: Enable Row Level Security (RLS)
-- 第五部分：啟用行級安全策略
-- ============================================
--
-- IMPORTANT: Security Architecture / 重要：安全架構
-- ============================================
-- This application uses a TWO-LAYER security approach:
-- 本應用程式使用兩層安全架構：
--
-- 1. APPLICATION LAYER (Password Protection) / 應用層（密碼保護）
--    - Password protection is implemented in Next.js middleware
--    - 密碼保護在 Next.js middleware 中實現
--    - Users must enter password to access the UI
--    - 用戶必須輸入密碼才能訪問 UI
--    - Password is stored in environment variable SITE_PASSWORD
--    - 密碼存儲在環境變數 SITE_PASSWORD 中
--
-- 2. DATABASE LAYER (Row Level Security) / 數據庫層（行級安全）
--    - RLS policies are currently OPEN (allow all access)
--    - RLS 策略目前是開放的（允許所有訪問）
--    - This is because password protection happens at application level
--    - 這是因為密碼保護在應用層進行
--    - If someone bypasses the password, they can still access data via API
--    - 如果有人繞過密碼，仍可通過 API 訪問數據
--
-- NOTE: For stronger security, you can modify RLS policies to restrict access.
-- However, this requires implementing user authentication in the database.
-- See AUTHENTICATION_IMPLEMENTATION.md for details.
--
-- 注意：為了更強的安全性，可以修改 RLS 策略以限制訪問。
-- 但這需要在數據庫中實現用戶身份驗證。
-- 詳見 AUTHENTICATION_IMPLEMENTATION.md
-- ============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON students;
DROP POLICY IF EXISTS "Allow public read access" ON subjects;
DROP POLICY IF EXISTS "Allow public read access" ON assessments;
DROP POLICY IF EXISTS "Allow public read access" ON transactions;
DROP POLICY IF EXISTS "Allow public read access" ON reward_rules;

DROP POLICY IF EXISTS "Allow insert" ON students;
DROP POLICY IF EXISTS "Allow insert" ON subjects;
DROP POLICY IF EXISTS "Allow insert" ON assessments;
DROP POLICY IF EXISTS "Allow insert" ON transactions;
DROP POLICY IF EXISTS "Allow insert" ON reward_rules;

DROP POLICY IF EXISTS "Allow update" ON students;
DROP POLICY IF EXISTS "Allow update" ON subjects;
DROP POLICY IF EXISTS "Allow update" ON assessments;
DROP POLICY IF EXISTS "Allow update" ON transactions;
DROP POLICY IF EXISTS "Allow update" ON reward_rules;

DROP POLICY IF EXISTS "Allow delete" ON students;
DROP POLICY IF EXISTS "Allow delete" ON subjects;
DROP POLICY IF EXISTS "Allow delete" ON assessments;
DROP POLICY IF EXISTS "Allow delete" ON transactions;
DROP POLICY IF EXISTS "Allow delete" ON reward_rules;

-- Create RLS policies
-- NOTE: These policies allow ALL access (USING (true))
-- This works with application-level password protection.
-- For production with multiple users, consider implementing
-- user-based RLS policies (see AUTHENTICATION_IMPLEMENTATION.md)
--
-- 注意：這些策略允許所有訪問（USING (true)）
-- 這與應用層密碼保護配合使用。
-- 對於多用戶生產環境，請考慮實現
-- 基於用戶的 RLS 策略（見 AUTHENTICATION_IMPLEMENTATION.md）

CREATE POLICY "Allow public read access" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON assessments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON reward_rules FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON reward_rules FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow update" ON subjects FOR UPDATE USING (true);
CREATE POLICY "Allow update" ON assessments FOR UPDATE USING (true);
CREATE POLICY "Allow update" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Allow update" ON reward_rules FOR UPDATE USING (true);

CREATE POLICY "Allow delete" ON students FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON subjects FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON assessments FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON transactions FOR DELETE USING (true);
CREATE POLICY "Allow delete" ON reward_rules FOR DELETE USING (true);

-- ============================================
-- PART 6: Additional Tables and Migrations
-- 第六部分：額外的表和遷移
-- ============================================

-- Step 1: Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at 
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_settings (open access, protected by application password)
-- site_settings 的 RLS 策略（開放訪問，由應用層密碼保護）
DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert" ON site_settings;
CREATE POLICY "Allow insert" ON site_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update" ON site_settings;
CREATE POLICY "Allow update" ON site_settings FOR UPDATE USING (true);

INSERT INTO site_settings (key, value) VALUES 
  ('site_name', 'Wilbur''s RewardBook')
ON CONFLICT (key) DO NOTHING;

-- Step 2: Add display_order to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

UPDATE students 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM students
) AS subquery
WHERE students.id = subquery.id AND students.display_order = 0;

CREATE INDEX IF NOT EXISTS idx_students_display_order ON students(display_order);

-- Step 3: Add subject_id to reward_rules table
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reward_rules_subject_id ON reward_rules(subject_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_student_id ON reward_rules(student_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_active ON reward_rules(is_active);

COMMENT ON COLUMN reward_rules.subject_id IS '科目ID（NULL表示適用所有科目）';
COMMENT ON COLUMN reward_rules.student_id IS '學生ID（NULL表示適用所有學生）';

-- Step 4: Add display_order to reward_rules table
ALTER TABLE reward_rules 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

UPDATE reward_rules 
SET display_order = subquery.row_num
FROM (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN student_id IS NOT NULL AND subject_id IS NOT NULL THEN 1
          WHEN student_id IS NULL AND subject_id IS NOT NULL THEN 2
          WHEN student_id IS NOT NULL AND subject_id IS NULL THEN 3
          ELSE 4
        END
      ORDER BY priority DESC, created_at ASC
    ) as row_num
  FROM reward_rules
) AS subquery
WHERE reward_rules.id = subquery.id AND reward_rules.display_order = 0;

CREATE INDEX IF NOT EXISTS idx_reward_rules_display_order ON reward_rules(display_order);

-- Step 5: Add pagination settings
INSERT INTO site_settings (key, value, created_at, updated_at)
VALUES ('items_per_page', '25', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Step 6: Create backups table
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  backup_data JSONB NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_backups_updated_at ON backups;
CREATE TRIGGER update_backups_updated_at 
BEFORE UPDATE ON backups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_name ON backups(name);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- RLS policies for backups (open access, protected by application password)
-- backups 的 RLS 策略（開放訪問，由應用層密碼保護）
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
  RAISE NOTICE '📝 All tables, views, indexes, and configurations have been created.';
  RAISE NOTICE '🎯 You can now start using the application.';
END $$;
