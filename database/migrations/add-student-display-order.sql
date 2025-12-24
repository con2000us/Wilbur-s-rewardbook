-- 為 students 表添加顯示順序欄位
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 為現有學生設置初始順序（按創建時間）
UPDATE students 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM students
) AS subquery
WHERE students.id = subquery.id;

-- 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_students_display_order ON students(display_order);

