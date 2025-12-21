-- 修復 student_summary 視圖的評量計數問題
-- 問題：JOIN transactions 時造成笛卡爾積，導致 COUNT(a.id) 計數錯誤
-- 解決：使用 COUNT(DISTINCT a.id) 來避免重複計數

-- 1. 刪除舊視圖
DROP VIEW IF EXISTS student_summary;

-- 2. 重新創建修復後的視圖
CREATE VIEW student_summary AS
SELECT 
  s.id as student_id,
  s.name,
  COUNT(DISTINCT sub.id) as total_subjects,
  COUNT(DISTINCT a.id) as total_assessments,  -- 修復：使用 DISTINCT
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assessments,  -- 修復：使用 DISTINCT
  COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as total_earned,
  COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as total_spent,
  COALESCE(SUM(t.amount), 0) as balance
FROM students s
LEFT JOIN subjects sub ON s.id = sub.student_id
LEFT JOIN assessments a ON sub.id = a.subject_id
LEFT JOIN transactions t ON s.id = t.student_id
GROUP BY s.id, s.name;

-- 3. 驗證修復結果
SELECT 
  student_id,
  name,
  total_subjects as 科目數,
  total_assessments as 評量數,
  completed_assessments as 已完成,
  total_earned as 已獲得,
  total_spent as 已花費,
  balance as 餘額
FROM student_summary;

-- 4. 詳細檢查某個學生的數據（替換成實際的學生ID）
-- SELECT 
--   '實際評量數:' as 類型,
--   COUNT(*) as 數量
-- FROM assessments a
-- JOIN subjects s ON a.subject_id = s.id
-- WHERE s.student_id = '學生UUID';

-- 5. 成功提示
DO $$
BEGIN
  RAISE NOTICE '✅ student_summary 視圖已修復！';
  RAISE NOTICE '📝 現在使用 COUNT(DISTINCT) 來避免重複計數';
  RAISE NOTICE '🎯 評量數量應該顯示正確了';
END $$;

