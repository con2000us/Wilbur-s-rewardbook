-- 測試顏色儲存
-- 檢查學生表中的 avatar_url 格式

-- 查看所有學生的頭像資料
SELECT 
  id,
  name,
  avatar_url,
  CASE 
    WHEN avatar_url IS NULL THEN 'NULL'
    WHEN avatar_url LIKE 'emoji:%|%' THEN 'Valid Format'
    ELSE 'Invalid Format'
  END as format_status,
  CASE 
    WHEN avatar_url LIKE 'emoji:%|%' THEN 
      SPLIT_PART(avatar_url, '|', 2)
    ELSE NULL
  END as color_gradient
FROM students
ORDER BY created_at DESC;

-- 檢查特定學生的頭像格式
-- SELECT 
--   id,
--   name,
--   avatar_url,
--   SPLIT_PART(avatar_url, ':', 2) as emoji_part,
--   SPLIT_PART(SPLIT_PART(avatar_url, ':', 2), '|', 1) as emoji,
--   SPLIT_PART(SPLIT_PART(avatar_url, ':', 2), '|', 2) as color
-- FROM students
-- WHERE id = 'YOUR_STUDENT_ID_HERE';

