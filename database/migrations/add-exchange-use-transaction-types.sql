-- =====================================
-- 添加 'exchange' 和 'use' 交易類型
-- 對應設計文件：docs/REWARD_SYSTEM_DESIGN_PLAN.md §三 Layer 5
--   earn（獲得）/ use（使用）/ exchange（兌換）/ penalty（懲罰）/ reset（重置）
-- =====================================

-- Step 1: 刪除舊的 CHECK 約束
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Step 2: 添加新的 CHECK 約束
-- 移除已廢棄的 'spend'、'bonus'，加入 'exchange'、'use'
ALTER TABLE transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('earn', 'use', 'exchange', 'penalty', 'reset'));

-- Step 3: 驗證
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'transactions_transaction_type_check';
