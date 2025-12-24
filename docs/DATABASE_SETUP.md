# Database Setup Guide / 資料庫設置指南

This guide will help you set up the database for Wilbur's Reward Book.

## Quick Setup / 快速設置

**Just run one file!** Execute `database/setup-database.sql` in your Supabase SQL Editor.

**只需執行一個文件！** 在 Supabase SQL Editor 中執行 `database/setup-database.sql`。

```sql
-- Copy and paste the entire content of database/setup-database.sql
-- 複製並貼上 database/setup-database.sql 的完整內容
```

That's it! The script will set up everything automatically.

就這麼簡單！腳本會自動設置所有內容。

## What the script does / 腳本會做什麼

The `database/setup-database.sql` file includes all necessary migrations in the correct order:

`database/setup-database.sql` 文件按正確順序包含所有必要的遷移：

1. ✅ Creates `update_updated_at_column()` function
2. ✅ Creates `site_settings` table with default site name
3. ✅ Adds `display_order` to `students` table
4. ✅ Adds `subject_id` to `reward_rules` table
5. ✅ Adds `display_order` to `reward_rules` table
6. ✅ Adds `reset` transaction type support
7. ✅ Adds pagination settings
8. ✅ Creates `backups` table

## Optional Files / 可選文件

- **`database/examples/default-reward-rules.sql`** - Sample reward rules (optional, for testing)
- **`database/examples/subject-specific-reward-rules.sql`** - Example subject-specific rules

## Notes / 注意事項

- The script uses `IF NOT EXISTS` and `IF EXISTS` checks, so it's safe to run multiple times
- 腳本使用 `IF NOT EXISTS` 和 `IF EXISTS` 檢查，因此可以安全地多次執行
- All migrations are idempotent (can be run multiple times without issues)
- 所有遷移都是冪等的（可以多次執行而不會出現問題）
- After running the script, you can start using the application
- 執行腳本後，即可開始使用應用程式

## Individual Migration Files / 單獨的遷移文件

If you prefer to run migrations individually, you can use the SQL files under `database/migrations/`:

如果你更喜歡單獨執行遷移，可以使用 `database/migrations/` 目錄下的 SQL 文件：

1. `database/migrations/add-site-settings.sql`
2. `database/migrations/add-student-display-order.sql`
3. `database/migrations/add-subject-to-reward-rules.sql`
4. `database/migrations/add-reward-rules-display-order.sql`
5. `database/migrations/add-reset-transaction-type.sql`
6. `database/migrations/add-pagination-settings.sql`
7. `database/migrations/add-backups-table.sql`

However, **we recommend using `database/setup-database.sql`** for simplicity.

但是，**我們建議使用 `database/setup-database.sql`** 以簡化流程。
