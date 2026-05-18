# Supabase Storage：`goal-images` bucket（大型目標圖片）

本文件說明如何在 **Supabase 後台（Dashboard）** 建立 bucket、設定公開讀取，以及與本專案環境變數的對應。  
（初始安裝總覽亦見：`docs/wiki/WIKI_INSTALLATION_GUIDE.md` 步驟 4.4、`database/bootstrap/README.md`。）

---

## 一、在後台建立 bucket（必做）

1. 登入 [Supabase](https://supabase.com)，進入你的專案。
2. 左側選單點 **「Storage」**。
3. 點 **「New bucket」**。
4. **Name** 填 **`goal-images`**（請與程式中的 bucket 名稱完全一致）。
5. 開啟 **「Public bucket」**（公開 bucket，前端才能用公開 URL 顯示縮圖）。
6. 點 **「Create」** / **「Create bucket」** 完成建立。

> 僅建立 bucket **不會**自動處理資料表欄位；`goal_templates.image_urls` 等請執行 `database/migrations/add-goal-template-images.sql`（或依 `database/bootstrap/README.md` 流程）。

---

## 二、Storage 政策（建議：公開讀取）

上傳寫入目前由後端使用 **Service Role**（見第三節），但**瀏覽器顯示圖片**仍須能讀取物件，建議為 `storage.objects` 加上 **SELECT** 政策。

### 方式 A：SQL Editor（最穩）

在 Supabase **SQL Editor** 新增查詢並執行（若已存在同名政策可先刪除再建，或改政策名稱）：

```sql
-- 允許任何人讀取 goal-images bucket 內檔案（公開圖）
CREATE POLICY "Allow public read goal-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'goal-images');
```

### 方式 B：後台 Policies 表單

1. **Storage** → **Policies**（或進入 `goal-images` 的 Policies）。
2. 新增政策：**Allowed operation** 選 **SELECT**。
3. 政策定義使用 `bucket_id = 'goal-images'`（或與上列 SQL 等價之條件）。
4. 若介面有 **Target roles**：可留空或包含 **`anon`** 與 **`authenticated`**，以便匿名與登入請求皆可讀（依你專案需求調整）。

> **INSERT / DELETE**：本專案 `app/api/goal-templates/upload-image` 與 `delete-image` 使用 **`SUPABASE_SERVICE_ROLE_KEY`** 的 Admin Client 時，**會繞過 Storage RLS**。若未設定 Service Role、改以匿名／使用者金鑰上傳，才需在 Storage 另外建立 INSERT/DELETE 政策（進階）。

---

## 三、環境變數（圖片上傳建議設定）

在 **Vercel** 專案環境變數，或本機 **`.env.local`** 中加入：

| 變數名稱 | 說明 |
|----------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 到 Supabase **Settings → API**，複製 **`service_role` secret**（僅伺服端使用，**勿**提交到 Git、勿暴露給瀏覽器）。 |

未設定時，`createAdminClient()` 會退回使用 anon key，上傳可能受 Storage RLS 限制而失敗。

---

## 四、驗證

1. 開啟站台的 **設定 → 獎勵中心**（`/settings/rewards`）。
2. 切到 **大型目標**（Goal Templates）分頁。
3. 新增或編輯模板，於圖片區上傳檔案後儲存。
4. 列表應出現縮圖；若僅上傳成功但圖片無法顯示，請檢查 **公開 bucket** 與 **SELECT** 政策。

---

## 五、用量上限（應用程式邏輯）

- **Free 模式**：總量約 600MB、單檔約 2MB（可於站內資源模式設定調整）。
- **Upgraded 模式**：依實作可不強制上限。

---

## English summary

1. **Dashboard**: Storage → New bucket → name **`goal-images`** → **Public** ON → Create.  
2. **Policy**: `SELECT` on `storage.objects` with `bucket_id = 'goal-images'` (SQL Editor snippet in section 2).  
3. **Env**: set **`SUPABASE_SERVICE_ROLE_KEY`** on the server for reliable uploads via service role.
