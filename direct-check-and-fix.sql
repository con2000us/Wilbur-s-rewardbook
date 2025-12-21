-- 直接檢查和修復評量計數問題
-- 請在 Supabase SQL Editor 中逐步執行

-- =====================================
-- 第 1 步：查看小明的實際數據
-- =====================================
SELECT '========== 第 1 步：小明的實際評量數據 ==========' as 步驟;

-- 查找小明的 ID
SELECT id, name FROM students WHERE name LIKE '%小明%' OR name LIKE '%明%';

-- 查看小明的所有評量（請先執行上面查詢獲得小明的ID，然後替換下面的 'STUDENT_ID'）
-- SELECT 
--   a.id,
--   a.title as 評量名稱,
--   s.name as 科目,
--   a.status,
--   a.score
-- FROM assessments a
-- JOIN subjects s ON a.subject_id = s.id
-- WHERE s.student_id = 'STUDENT_ID';

-- =====================================
-- 第 2 步：檢查 assessments 表中是否有重複記錄
-- =====================================
SELECT '========== 第 2 步：檢查重複記錄 ==========' as 步驟;

SELECT 
  a.id as 評量ID,
  s.name as 科目,
  a.title as 評量名稱,
  a.status as 狀態,
  a.score as 分數,
  a.created_at as 創建時間
FROM assessments a
JOIN subjects s ON a.subject_id = s.id
ORDER BY s.student_id, a.created_at DESC;

-- 查看是否有完全重複的記錄
SELECT 
  subject_id,
  title,
  status,
  COUNT(*) as 重複次數
FROM assessments
GROUP BY subject_id, title, status
HAVING COUNT(*) > 1;

-- =====================================
-- 第 3 步：強制重建視圖
-- =====================================
SELECT '========== 第 3 步：重建視圖 ==========' as 步驟;

DROP VIEW IF EXISTS student_summary CASCADE;

CREATE VIEW student_summary AS
SELECT 
  s.id as student_id,
  s.name,
  (SELECT COUNT(DISTINCT id) FROM subjects WHERE student_id = s.id) as total_subjects,
  (SELECT COUNT(a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
  ) as total_assessments,
  (SELECT COUNT(a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
     AND a.status = 'completed'
  ) as completed_assessments,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id AND amount > 0), 0) as total_earned,
  COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE student_id = s.id AND amount < 0), 0) as total_spent,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id), 0) as balance
FROM students s;

-- =====================================
-- 第 4 步：驗證視圖
-- =====================================
SELECT '========== 第 4 步：驗證修復結果 ==========' as 步驟;

SELECT 
  name as 學生名稱,
  total_subjects as 科目數,
  total_assessments as 評量數,
  completed_assessments as 已完成數
FROM student_summary;

-- =====================================
-- 第 5 步：詳細對比檢查
-- =====================================
SELECT '========== 第 5 步：詳細對比 ==========' as 步驟;

-- 方法 A：直接統計
SELECT 
  st.name as 學生,
  (SELECT COUNT(*) FROM subjects WHERE student_id = st.id) as 實際科目數,
  (SELECT COUNT(a.*) 
   FROM assessments a 
   JOIN subjects s ON a.subject_id = s.id 
   WHERE s.student_id = st.id
  ) as 實際評量數,
  (SELECT COUNT(a.*) 
   FROM assessments a 
   JOIN subjects s ON a.subject_id = s.id 
   WHERE s.student_id = st.id AND a.status = 'completed'
  ) as 實際已完成數
FROM students st;

-- 方法 B：視圖數據
SELECT 
  name as 學生,
  total_subjects as 視圖科目數,
  total_assessments as 視圖評量數,
  completed_assessments as 視圖已完成數
FROM student_summary;

-- =====================================
-- 第 6 步：如果有重複，清理重複記錄
-- =====================================
-- 只有在確認有重複時才執行！

-- 先查看可能的重複
SELECT 
  a1.id as ID1,
  a2.id as ID2,
  s.name as 科目,
  a1.title as 評量名稱,
  a1.status,
  a1.created_at as 創建時間1,
  a2.created_at as 創建時間2
FROM assessments a1
JOIN assessments a2 ON 
  a1.subject_id = a2.subject_id AND
  a1.title = a2.title AND
  a1.status = a2.status AND
  a1.id < a2.id
JOIN subjects s ON a1.subject_id = s.id
ORDER BY s.name, a1.title;

-- 如果上面查詢顯示有重複，取消下面的註釋來刪除
-- DELETE FROM assessments WHERE id IN (
--   SELECT a2.id
--   FROM assessments a1
--   JOIN assessments a2 ON 
--     a1.subject_id = a2.subject_id AND
--     a1.title = a2.title AND
--     a1.status = a2.status AND
--     a1.id < a2.id
-- );

-- =====================================
-- 完成
-- =====================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ 診斷完成！';
  RAISE NOTICE '';
  RAISE NOTICE '請檢查上面的查詢結果：';
  RAISE NOTICE '1. 第 2 步：是否有重複記錄？';
  RAISE NOTICE '2. 第 5 步：實際數據 vs 視圖數據是否一致？';
  RAISE NOTICE '';
  RAISE NOTICE '如果數據一致，請：';
  RAISE NOTICE '  - 重啟 Next.js 服務器';
  RAISE NOTICE '  - 硬刷新瀏覽器 (Ctrl+Shift+R)';
  RAISE NOTICE '';
  RAISE NOTICE '如果仍有問題，請截圖發送：';
  RAISE NOTICE '  - 第 2 步的結果';
  RAISE NOTICE '  - 第 5 步的結果';
  RAISE NOTICE '======================================';
END $$;

