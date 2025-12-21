-- 修復缺少 transaction_date 的交易記錄
-- 對於有關聯評量的交易，使用評量的 due_date
-- 對於沒有關聯評量的交易，使用 created_at 的日期

-- 1. 更新有評量關聯的交易記錄
UPDATE transactions t
SET transaction_date = a.due_date
FROM assessments a
WHERE t.assessment_id = a.id
  AND t.transaction_date IS NULL
  AND a.due_date IS NOT NULL;

-- 2. 更新沒有評量關聯的交易記錄（使用 created_at）
UPDATE transactions
SET transaction_date = DATE(created_at)
WHERE transaction_date IS NULL;

-- 驗證結果
SELECT 
  COUNT(*) as total_transactions,
  COUNT(transaction_date) as with_date,
  COUNT(*) - COUNT(transaction_date) as without_date
FROM transactions;

