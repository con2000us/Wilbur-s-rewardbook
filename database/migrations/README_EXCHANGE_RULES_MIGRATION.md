# Exchange Rules Migration Guide / 兌換規則遷移指南

## 問題說明 / Problem Description

如果遇到錯誤：`Could not find the 'reward_amount' column of 'exchange_rules' in the schema cache`

這表示資料庫中缺少 `reward_amount` 和 `reward_type_id` 欄位。

If you encounter the error: `Could not find the 'reward_amount' column of 'exchange_rules' in the schema cache`

This means the database is missing the `reward_amount` and `reward_type_id` columns.

## 解決方法 / Solution

### 方法 1：一次性執行（推薦）/ Method 1: One-time execution (Recommended)

**最簡單的方式：執行合併的遷移文件**

**Simplest way: Execute the combined migration file**

執行文件：`database/migrations/add-exchange-rules-complete.sql`

Execute file: `database/migrations/add-exchange-rules-complete.sql`

這個文件包含了所有必要的遷移步驟，一次性完成設置。

This file contains all necessary migration steps and completes the setup in one go.

---

### 方法 2：分步執行 / Method 2: Step-by-step execution

如果您想分步執行，請按照以下順序在 Supabase SQL Editor 中執行遷移文件：

If you prefer to execute step by step, please execute the migration files in the following order in Supabase SQL Editor:

#### 步驟 1 / Step 1: 創建 exchange_rules 表

執行文件：`database/migrations/add-exchange-rules-table.sql`

Execute file: `database/migrations/add-exchange-rules-table.sql`

#### 步驟 2 / Step 2: 添加類型對類型兌換支持

執行文件：`database/migrations/update-exchange-rules-for-type-to-type.sql`

Execute file: `database/migrations/update-exchange-rules-for-type-to-type.sql`

## 執行方式 / How to Execute

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製並貼上遷移文件的完整內容
4. 點擊「Run」執行
5. 確認執行成功（應該會看到 "Success" 訊息）

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the complete content of the migration file
4. Click "Run" to execute
5. Confirm execution success (you should see a "Success" message)

## 注意事項 / Notes

- 這些遷移文件使用 `IF NOT EXISTS` 和 `IF EXISTS` 檢查，可以安全地多次執行
- These migration files use `IF NOT EXISTS` and `IF EXISTS` checks, so they can be safely executed multiple times
- **推薦使用方法 1（一次性執行）**，更簡單且不容易出錯
- **Method 1 (one-time execution) is recommended** as it's simpler and less error-prone
- 如果使用方法 2，執行順序很重要，請先執行 `add-exchange-rules-table.sql`，再執行 `update-exchange-rules-for-type-to-type.sql`
- If using Method 2, the execution order is important. Please execute `add-exchange-rules-table.sql` first, then `update-exchange-rules-for-type-to-type.sql`
