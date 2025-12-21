-- 完整修復評量計數問題
-- 在 Supabase SQL Editor 中執行此腳本

-- =====================================
-- 診斷階段
-- =====================================

-- 1. 查看實際的評量數據
SELECT 
  '=== 實際評量數據 ===' as 診斷項目;

SELECT 
  st.name as 學生,
  s.name as 科目,
  a.title as 評量,
  a.status as 狀態,
  a.id
FROM students st
JOIN subjects s ON st.id = s.student_id
JOIN assessments a ON s.id = a.subject_id
ORDER BY st.name, s.name;

-- 2. 統計每個學生的實際評量數
SELECT 
  '=== 每個學生的實際評量統計 ===' as 診斷項目;

SELECT 
  st.name as 學生,
  COUNT(a.id) as 評量總數,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as 已完成數
FROM students st
LEFT JOIN subjects s ON st.id = s.student_id
LEFT JOIN assessments a ON s.id = a.subject_id
GROUP BY st.id, st.name;

-- =====================================
-- 修復階段
-- =====================================

-- 3. 強制刪除並重建視圖
DROP VIEW IF EXISTS student_summary CASCADE;

-- 4. 使用完全修復的版本重建視圖
CREATE OR REPLACE VIEW student_summary AS
SELECT 
  s.id as student_id,
  s.name,
  -- 科目數
  (SELECT COUNT(DISTINCT id) FROM subjects WHERE student_id = s.id) as total_subjects,
  -- 評量數（使用子查詢避免JOIN問題）
  (SELECT COUNT(a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
  ) as total_assessments,
  -- 已完成評量數
  (SELECT COUNT(a.id) 
   FROM assessments a 
   WHERE a.subject_id IN (SELECT id FROM subjects WHERE student_id = s.id)
     AND a.status = 'completed'
  ) as completed_assessments,
  -- 總獲得獎金
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id AND amount > 0), 0) as total_earned,
  -- 總花費
  COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE student_id = s.id AND amount < 0), 0) as total_spent,
  -- 餘額
  COALESCE((SELECT SUM(amount) FROM transactions WHERE student_id = s.id), 0) as balance
FROM students s;

-- =====================================
-- 驗證階段
-- =====================================

-- 5. 驗證修復結果
SELECT 
  '=== 修復後的視圖數據 ===' as 驗證項目;

SELECT 
  name as 學生,
  total_subjects as 科目數,
  total_assessments as 評量數,
  completed_assessments as 已完成,
  total_earned as 已獲得,
  total_spent as 已花費,
  balance as 餘額
FROM student_summary
ORDER BY name;

-- 6. 對比檢查（兩個結果應該一致）
SELECT 
  '=== 對比檢查：實際數據 vs 視圖數據 ===' as 驗證項目;

WITH actual_counts AS (
  SELECT 
    st.id,
    st.name,
    COUNT(a.id) as actual_assessments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as actual_completed
  FROM students st
  LEFT JOIN subjects s ON st.id = s.student_id
  LEFT JOIN assessments a ON s.id = a.subject_id
  GROUP BY st.id, st.name
)
SELECT 
  ac.name as 學生,
  ac.actual_assessments as 實際評量數,
  ss.total_assessments as 視圖評量數,
  CASE 
    WHEN ac.actual_assessments = ss.total_assessments THEN '✅ 一致'
    ELSE '❌ 不一致'
  END as 檢查結果,
  ac.actual_completed as 實際已完成,
  ss.completed_assessments as 視圖已完成,
  CASE 
    WHEN ac.actual_completed = ss.completed_assessments THEN '✅ 一致'
    ELSE '❌ 不一致'
  END as 完成數檢查
FROM actual_counts ac
LEFT JOIN student_summary ss ON ac.id = ss.student_id;

-- =====================================
-- 清理重複數據（如果有）
-- =====================================

-- 7. 檢查是否有重複的評量
SELECT 
  '=== 檢查重複評量 ===' as 檢查項目;

SELECT 
  subject_id,
  title,
  score,
  status,
  COUNT(*) as 重複次數
FROM assessments
GROUP BY subject_id, title, score, status, created_at
HAVING COUNT(*) > 1;

-- 如果上面的查詢顯示有重複，可以執行以下清理（謹慎使用）
-- DELETE FROM assessments a
-- USING assessments b
-- WHERE a.id > b.id
--   AND a.subject_id = b.subject_id
--   AND a.title = b.title
--   AND a.score = b.score
--   AND a.created_at = b.created_at;

-- =====================================
-- 成功提示
-- =====================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 視圖已完全重建！';
  RAISE NOTICE '📝 使用子查詢方式避免 JOIN 造成的重複計數';
  RAISE NOTICE '🔍 請查看上面的對比檢查結果';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 如果數據仍然錯誤，請檢查：';
  RAISE NOTICE '   1. 數據庫中是否有重複的評量記錄';
  RAISE NOTICE '   2. Next.js 是否需要重啟（Ctrl+C 後重新 npm run dev）';
  RAISE NOTICE '   3. 瀏覽器是否需要硬刷新（Ctrl+Shift+R）';
END $$;

