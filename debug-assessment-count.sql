-- 診斷評量計數問題
-- 在 Supabase SQL Editor 中執行此腳本

-- =====================================
-- 步驟 1：檢查視圖是否已修復
-- =====================================
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name = 'student_summary';

-- =====================================
-- 步驟 2：查看所有學生的實際評量數
-- =====================================
SELECT 
  st.id,
  st.name as 學生姓名,
  COUNT(DISTINCT a.id) as 實際評量數
FROM students st
LEFT JOIN subjects s ON st.id = s.student_id
LEFT JOIN assessments a ON s.id = a.subject_id
GROUP BY st.id, st.name
ORDER BY st.name;

-- =====================================
-- 步驟 3：查看 student_summary 視圖的數據
-- =====================================
SELECT 
  name as 學生姓名,
  total_subjects as 科目數,
  total_assessments as 視圖顯示評量數,
  completed_assessments as 視圖顯示已完成數
FROM student_summary
ORDER BY name;

-- =====================================
-- 步驟 4：詳細檢查某個學生的所有評量
-- =====================================
-- 請先運行上面的查詢找到學生ID，然後替換下面的 '學生ID'
-- SELECT 
--   a.id,
--   a.title as 評量名稱,
--   s.name as 科目,
--   a.status as 狀態,
--   a.score as 分數,
--   a.created_at as 創建時間
-- FROM assessments a
-- JOIN subjects s ON a.subject_id = s.id
-- WHERE s.student_id = '學生ID'
-- ORDER BY a.created_at DESC;

-- =====================================
-- 步驟 5：檢查是否有重複的評量記錄
-- =====================================
SELECT 
  st.name as 學生姓名,
  s.name as 科目,
  a.title as 評量名稱,
  COUNT(*) as 出現次數
FROM students st
JOIN subjects s ON st.id = s.student_id
JOIN assessments a ON s.id = a.subject_id
GROUP BY st.name, s.name, a.title, a.id
HAVING COUNT(*) > 1;

-- =====================================
-- 步驟 6：查看所有評量的詳細信息
-- =====================================
SELECT 
  st.name as 學生,
  s.name as 科目,
  a.title as 評量,
  a.status as 狀態,
  a.score as 分數,
  a.id as 評量ID
FROM students st
JOIN subjects s ON st.id = s.student_id
JOIN assessments a ON s.id = a.subject_id
ORDER BY st.name, s.name, a.created_at DESC;

-- =====================================
-- 步驟 7：檢查交易記錄是否重複
-- =====================================
SELECT 
  st.name as 學生,
  COUNT(t.id) as 交易記錄數
FROM students st
LEFT JOIN transactions t ON st.id = t.student_id
GROUP BY st.id, st.name;

