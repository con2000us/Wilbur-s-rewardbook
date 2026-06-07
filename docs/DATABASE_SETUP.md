# Database Setup Guide / 資料庫設置指南

This guide will help you set up the database for Wilbur's Reward Book.

## Quick Setup / 快速設置

Run the consolidated bootstrap files in this order from `database/bootstrap/`:

請在 Supabase SQL Editor 依序執行 `database/bootstrap/` 內的整合初始化檔：

1. `database/bootstrap/01_schema.sql` — full schema
2. `database/bootstrap/02_seed_defaults.sql` — required default reward types
3. `database/bootstrap/03_seed_optional.sql` — optional sample reward rules
4. Optional demo data: run either `database/bootstrap/04_seed_demo_zh-TW.sql` or `database/bootstrap/04_seed_demo_en.sql`

`01_schema.sql` now includes the large-goal tables and links used by the current app: `goal_templates`, `goal_template_event_links`, `student_goals`, `transactions.goal_id`, and `transactions.consumed_by_goal_id`.

`01_schema.sql` 已包含目前大型目標流程需要的資料表與欄位：`goal_templates`、`goal_template_event_links`、`student_goals`、`transactions.goal_id`、`transactions.consumed_by_goal_id`。

`01_schema.sql` also includes explicit Supabase Data API grants for the current app-facing tables and `student_summary` view.

`01_schema.sql` 也已包含目前 app 會透過 Supabase Data API 存取的資料表與 `student_summary` view 的明確 grants。

## Important: Supabase Data API Grants / 重要：Supabase Data API 授權

Supabase is changing `public` schema Data API exposure in 2026. New `public` tables will require explicit PostgreSQL `GRANT` statements before PostgREST, GraphQL, or `supabase-js` can access them.

Supabase 於 2026 年調整 `public` schema 的 Data API 暴露規則。未來新建的 `public` 資料表需要明確 PostgreSQL `GRANT`，PostgREST、GraphQL 或 `supabase-js` 才能存取。

When adding new app-facing tables, views, or RPC functions, add explicit grants in the same migration as RLS policies. Existing Supabase databases should run `database/migrations/add-explicit-data-api-grants-2026.sql` once. See [SUPABASE_DATA_API_GRANTS_2026.md](./SUPABASE_DATA_API_GRANTS_2026.md).

新增會被 app 存取的 table、view 或 RPC function 時，請在同一份 migration 中加入明確 grants，並與 RLS policies 一起維護。既有 Supabase 資料庫請執行一次 `database/migrations/add-explicit-data-api-grants-2026.sql`。詳見 [SUPABASE_DATA_API_GRANTS_2026.md](./SUPABASE_DATA_API_GRANTS_2026.md)。

## What the bootstrap files do / Bootstrap 檔案會做什麼

The `database/bootstrap/` flow initializes a fresh project with the current schema and required seed data:

`database/bootstrap/` 流程會用目前最新 schema 與必要種子資料初始化新專案：

1. ✅ Creates core tables: students, subjects, assessments, transactions, reward rules, reward types, backups, settings
2. ✅ Creates achievement events, exchange rules, and reward type links
3. ✅ Creates large-goal tables: `goal_templates`, `goal_template_event_links`, `student_goals`
4. ✅ Adds large-goal reset/restart tracking fields: `transactions.goal_id`, `consumed_by_goal_id`
5. ✅ Enables indexes, foreign keys, and RLS policies needed by the app
6. ✅ Adds explicit Supabase Data API grants for app-facing public objects
7. ✅ Seeds default reward types and optional demo data

## Optional Files / 可選文件

- **`database/examples/default-reward-rules.sql`** - Sample reward rules (optional, for testing)
- **`database/examples/subject-specific-reward-rules.sql`** - Example subject-specific rules

## Optional: Large goal images (Storage) / 選用：大型目標圖片（Storage）

If you use **Rewards Center → Large goals** with **image upload**, create the **`goal-images`** public bucket and policies in the Supabase dashboard, and set **`SUPABASE_SERVICE_ROLE_KEY`** on your host. See **`docs/STORAGE_BUCKET_SETUP.md`**.  
若使用 **獎勵中心 → 大型目標** 的**圖片上傳**，請在 Supabase **後台**建立公開 bucket **`goal-images`**、設定讀取政策，並在部署環境設定 **`SUPABASE_SERVICE_ROLE_KEY`**。詳見 **`docs/STORAGE_BUCKET_SETUP.md`**。

## Notes / 注意事項

- `database/bootstrap/01_schema.sql` is intended for fresh projects. Run it before entering production data.
- `database/bootstrap/01_schema.sql` 適用於全新專案；請在輸入正式資料前執行。
- `database/migrations/` contains historical incremental scripts. Fresh installs do not need to run every migration one by one.
- `database/migrations/` 是歷史增量腳本；全新安裝不需要逐檔執行。
- `database/setup-database.sql` is a legacy fallback kept for older setup notes. New deployment docs use `database/bootstrap/`.
- `database/setup-database.sql` 是舊版備援流程；新的部署文件以 `database/bootstrap/` 為準。

## Individual Migration Files / 單獨的遷移文件

If you are upgrading an existing database, run only the missing migration files under `database/migrations/` that match your current schema gap.

如果你是在升級既有資料庫，只需針對目前缺少的 schema gap 執行 `database/migrations/` 內對應檔案。

For current P0 large-goal support, fresh installs are already covered by `database/bootstrap/01_schema.sql`.

目前 P0 大型目標支援已包含於 `database/bootstrap/01_schema.sql`，全新安裝不需另外補跑大型目標 migration。
