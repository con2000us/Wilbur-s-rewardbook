# Database Bootstrap（初始網站用 SQL）

所有「新專案／首次上線」需要在 Supabase 執行的 SQL 都集中在 **`database/bootstrap/`**。  
請在 Supabase **SQL Editor** 依下表順序執行（每檔貼上後按 **Run**）。

## 第一次部署 Checklist

| 步驟 | 檔案 | 必跑？ | 功能 |
|------|------|--------|------|
| 1 | `01_schema.sql` | **必跑** | 完整 schema（資料表、索引、FK、RLS、trigger 等）。含 `achievement_events` RLS 與現行欄位定義。全新空 DB 跑此檔即可登入初始化。 |
| 2 | `02_seed_defaults.sql` | **必跑** | 系統必要種子：五種預設獎勵類型（積分、獎金、愛心、星星、鑽石）、四種預設評量類別（考試、小考、作業、專題）、AI 評量匯入相關 `site_settings` 預設值。 |
| 3 | `03_seed_optional.sql` | 選用 | 範例全域獎勵規則（`reward_rules`）。正式環境若要乾淨 DB 可跳過。 |
| 4a | `04_seed_demo_zh-TW.sql` | 選用（擇一） | 繁中示範：成就事件、翻譯列、事件獎勵對應、兌換規則。 |
| 4b | `04_seed_demo_en.sql` | 選用（擇一） | 英文示範，內容類型同 4a。 |

### 建議組合

- **最小可運作（正式環境）**：`01` → `02`
- **本地開發／試用（含範例規則）**：`01` → `02` → `03`
- **含成就／兌換示範**：`01` → `02` → `03` → `04_seed_demo_zh-TW.sql` 或 `04_seed_demo_en.sql`

## 各檔詳細說明

### `01_schema.sql`

- 新環境的結構基礎，**一定要先跑**（建議在**全新空 DB** 或新 Supabase 專案上執行）。
- 已包含大型目標 P0 所需 schema、RLS（含 `achievement_events`），**不必**再補跑 `database/migrations/add-goal-templates*.sql`。
- 若專案已有正式資料，**不要**重跑整份 schema；舊 DB 升級請改用 `database/migrations/` 內對應遷移檔。

### `02_seed_defaults.sql`

- 建立／更新五種系統獎勵類型、四種系統評量類別與顯示順序。
- 可重複執行（使用 `ON CONFLICT` 更新）。

### `03_seed_optional.sql`

- 插入數條全域分數區間獎勵規則示範。
- 檔案開頭註明：production 若不要示範資料可跳過。

### `04_seed_demo_zh-TW.sql` / `04_seed_demo_en.sql`

- 依首次主要語系**擇一**執行即可。
- 採 `event_key` / `rule_key` + translation table，可重複執行且不重複插入。
- 需要成就事件、兌換規則示範時才跑。

## Storage（大型目標圖片）

若使用 **獎勵中心 → 大型目標** 的**圖片上傳**：

1. 在 Supabase **Storage** 建立公開 bucket **`goal-images`**
2. 設定 Storage 讀取政策
3. 部署環境設定 **`SUPABASE_SERVICE_ROLE_KEY`**

逐步說明見 **`docs/STORAGE_BUCKET_SETUP.md`**。

## 與 `database/migrations/` 的關係

- `database/migrations/` 為**歷史／增量遷移**，供舊專案升級用。
- **全新專案**以本資料夾為準即可，**不必**逐檔跑 migrations。
- 若仍看到 `database/initial.sql` 或 `database/setup-database.sql`：僅舊文件備援；新部署以 **`database/bootstrap/`** 為準。

## 相關文件

- 中英對照說明：`docs/DATABASE_SETUP.md`
- 根目錄快速開始：`README.zh-TW.md` / `README.md`
