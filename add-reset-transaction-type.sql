-- =====================================
-- 添加 'reset' 交易類型到 transactions 表
-- =====================================

-- Step 1: 刪除舊的 CHECK 約束
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Step 2: 添加新的 CHECK 約束（包含 'reset'）
ALTER TABLE transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('earn', 'spend', 'bonus', 'penalty', 'reset'));

-- Step 3: 驗證約束已更新
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'transactions_transaction_type_check';

-- Step 4: 測試插入 reset 類型記錄（可選）
-- INSERT INTO transactions (student_id, transaction_type, amount, description, category)
-- VALUES (
--   (SELECT id FROM students LIMIT 1),
--   'reset',
--   0,
--   '測試歸零記錄',
--   '系統校準'
-- );

-- 完成！現在可以使用 'reset' 類型了

