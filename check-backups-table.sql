-- 檢查 backups 表是否存在以及結構
-- Check if backups table exists and its structure

-- 1. 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'backups'
) AS table_exists;

-- 2. 查看表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'backups'
ORDER BY ordinal_position;

-- 3. 檢查 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'backups';

-- 4. 檢查是否有資料
SELECT COUNT(*) as total_backups FROM backups;

-- 5. 查看所有備份（如果有的話）
SELECT 
  id,
  name,
  description,
  file_size,
  created_at,
  updated_at
FROM backups
ORDER BY created_at DESC;

