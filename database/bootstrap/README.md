# Database Bootstrap（初始網站用 SQL）

所有「新專案／首次上線」需要在 Supabase 執行的 SQL 都集中在 **`database/bootstrap/`** 這個資料夾，請依序執行。

## 執行順序

1. **`01_schema.sql`** — 完整 `public` schema（由線上資料庫匯出，體積較大屬正常）
2. **`02_seed_defaults.sql`** — 五種預設獎勵類型（必要基礎資料）
3. **`03_seed_optional.sql`**（選用）— 範例獎勵規則等示範資料
4. **擇一執行（選用）語系範例資料（成就事件 + 兌換規則）**
   - **`04_seed_demo_zh-TW.sql`**
   - **`04_seed_demo_en.sql`**
5. **`05_goal_templates_rls.sql`**（舊版備援）— 目前 `01_schema.sql` 已包含 `goal_templates` 與 `goal_template_event_links` 的 RLS；只有在你使用舊版 schema dump、且缺少大型目標 RLS 時才需要補跑。

## Storage（大型目標圖片）

若使用 **獎勵中心 → 大型目標** 的**圖片上傳**，須在 Supabase **後台**建立公開 bucket **`goal-images`**，並設定 Storage 讀取政策；上傳 API 需在部署環境設定 **`SUPABASE_SERVICE_ROLE_KEY`**（`service_role` 金鑰，勿公開）。  
逐步截圖與 SQL 範例見專案內 **`docs/STORAGE_BUCKET_SETUP.md`**。

## 注意

- 若你仍看到舊路徑 `database/initial.sql`：該檔僅保留轉向說明；實際 schema 內容在 **`01_schema.sql`**。
- `database/migrations/` 內為歷史／增量遷移，**不必**在全新專案時逐檔跑一遍；新環境以本資料夾流程為準即可。
- 目前 `01_schema.sql` 已包含大型目標 P0 所需 schema：`goal_templates`、`goal_template_event_links`、`student_goals`、`transactions.goal_id`、`transactions.consumed_by_goal_id`、相關 index/FK/RLS。
- 語系範例資料改為分檔；請依「首次語系選擇」決定執行 `04_seed_demo_zh-TW.sql` 或 `04_seed_demo_en.sql`。
- `04_seed_demo_*` 皆採 canonical key + translation table（`event_key/rule_key` + translation tables）流程，可重複執行且不重複插入。
