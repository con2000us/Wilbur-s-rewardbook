-- =====================================
-- 更新 student_summary 視圖以支持歸零記錄
-- =====================================
-- 此腳本更新視圖，使累計獎金只從最近的歸零記錄開始計算

-- 刪除舊視圖
DROP VIEW IF EXISTS student_summary;

-- 創建新視圖
CREATE OR REPLACE VIEW student_summary AS
SELECT 
  s.id as student_id,
  s.name,
  -- 科目數
  (SELECT COUNT(DISTINCT id) FROM subjects WHERE student_id = s.id) as total_subjects,
  -- 評量數
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
  -- 總獲得獎金（從最近歸零記錄開始計算）
  COALESCE((
    SELECT SUM(amount) 
    FROM transactions t
    WHERE t.student_id = s.id 
      AND t.amount > 0
      AND (
        -- 如果沒有歸零記錄，計算所有記錄
        NOT EXISTS (
          SELECT 1 FROM transactions 
          WHERE student_id = s.id 
            AND transaction_type = 'reset'
        )
        OR
        -- 如果有歸零記錄，只計算日期晚於歸零日期的記錄
        -- 歸零記錄視為該天最後發生，所以同一天的記錄不計入
        COALESCE(t.transaction_date, DATE(t.created_at)) > (
          SELECT COALESCE(transaction_date, DATE(created_at))
          FROM transactions
          WHERE student_id = s.id
            AND transaction_type = 'reset'
          ORDER BY COALESCE(transaction_date, DATE(created_at)) DESC, created_at DESC
          LIMIT 1
        )
      )
  ), 0) as total_earned,
  -- 總花費（從最近歸零記錄開始計算）
  COALESCE((
    SELECT SUM(ABS(amount)) 
    FROM transactions t
    WHERE t.student_id = s.id 
      AND t.amount < 0
      AND (
        -- 如果沒有歸零記錄，計算所有記錄
        NOT EXISTS (
          SELECT 1 FROM transactions 
          WHERE student_id = s.id 
            AND transaction_type = 'reset'
        )
        OR
        -- 如果有歸零記錄，只計算日期晚於歸零日期的記錄
        -- 歸零記錄視為該天最後發生，所以同一天的記錄不計入
        COALESCE(t.transaction_date, DATE(t.created_at)) > (
          SELECT COALESCE(transaction_date, DATE(created_at))
          FROM transactions
          WHERE student_id = s.id
            AND transaction_type = 'reset'
          ORDER BY COALESCE(transaction_date, DATE(created_at)) DESC, created_at DESC
          LIMIT 1
        )
      )
  ), 0) as total_spent,
  -- 餘額（從最近歸零記錄開始計算，包含起始金額）
  COALESCE((
    -- 起始金額（最近歸零記錄的金額）
    SELECT COALESCE(
      (SELECT amount 
       FROM transactions 
       WHERE student_id = s.id 
         AND transaction_type = 'reset'
       ORDER BY COALESCE(transaction_date, DATE(created_at)) DESC, created_at DESC
       LIMIT 1
      ), 0
    )
    +
    -- 歸零後的收支總和
    (SELECT COALESCE(SUM(amount), 0)
     FROM transactions t
     WHERE t.student_id = s.id 
       AND t.transaction_type != 'reset'
       AND (
         -- 如果沒有歸零記錄，計算所有記錄
         NOT EXISTS (
           SELECT 1 FROM transactions 
           WHERE student_id = s.id 
             AND transaction_type = 'reset'
         )
         OR
         -- 如果有歸零記錄，只計算日期晚於歸零日期的記錄
         -- 歸零記錄視為該天最後發生，所以同一天的記錄不計入
         COALESCE(t.transaction_date, DATE(t.created_at)) > (
           SELECT COALESCE(transaction_date, DATE(created_at))
           FROM transactions
           WHERE student_id = s.id
             AND transaction_type = 'reset'
           ORDER BY COALESCE(transaction_date, DATE(created_at)) DESC, created_at DESC
           LIMIT 1
         )
       )
    )
  ), 0) as balance
FROM students s;

-- 添加註釋
COMMENT ON VIEW student_summary IS '學生總覽視圖 - 統計數據從最近的歸零記錄開始計算';

-- 驗證視圖
SELECT * FROM student_summary;

