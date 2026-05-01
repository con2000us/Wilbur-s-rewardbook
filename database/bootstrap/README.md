# Database Bootstrap（初始網站用 SQL）

所有「新專案／首次上線」需要在 Supabase 執行的 SQL 都集中在 **`database/bootstrap/`** 這個資料夾，請依序執行。

## 執行順序

1. **`01_schema.sql`** — 完整 `public` schema（由線上資料庫匯出，體積較大屬正常）
2. **`02_seed_defaults.sql`** — 五種預設獎勵類型 + 預設優良成就事件與事件對應獎勵規則
3. **`03_seed_optional.sql`**（選用）— 範例獎勵規則等示範資料

## 注意

- 若你仍看到舊路徑 `database/initial.sql`：該檔僅保留轉向說明；實際 schema 內容在 **`01_schema.sql`**。
- `database/migrations/` 內為歷史／增量遷移，**不必**在全新專案時逐檔跑一遍；新環境以本資料夾三步驟為準即可。
