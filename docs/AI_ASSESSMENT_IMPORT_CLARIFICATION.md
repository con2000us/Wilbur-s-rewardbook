# AI 評量匯入 — 評估現狀與待釐清事項

> 基於 `docs/AI_ASSESSMENT_IMPORT_TODO.md` 與現有 codebase 現狀調查，彙整實作前需確認的決策點。

---

## 現有 infrastructure 現狀總結

### 既有 `assessments` 表（已上線）

`public.assessments` 包含以下與 AI 匯入相關的欄位：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `subject_id` | uuid | 關聯到 `subjects` 表（科目） |
| `title` | text | 評量名稱（e.g.「第一次月考」） |
| `assessment_type` | exam / homework / quiz / project | 限制四種 |
| `score` | numeric(5,2) | 得分 |
| `max_score` | numeric(5,2) | 滿分（預設 100） |
| `percentage` | numeric(5,2) | 百分比 |
| `grade` | A+ ~ F | 等級 |
| `score_type` | numeric / letter | 評分方式 |
| `due_date` | timestamptz | 考試/評量日期 |
| `notes` | text | 備註 |
| `image_urls` | JSONB | 評量圖片（migration 已加，型別尚未同步） |
| `status` | upcoming / completed / graded | 狀態 |

### 既有 API（5 個 routes）

| Route | 功能 |
|---|---|
| `POST /api/assessments/create` | 建立評量 + 自動計算獎金 + 建立交易 |
| `POST /api/assessments/update` | 更新評量（先刪舊交易再重建） |
| `POST /api/assessments/delete` | 刪除評量及關聯交易 |
| `POST /api/assessments/upload-image` | 上傳圖片到 `goal-images` bucket |
| `POST /api/assessments/delete-image` | 刪除指定圖片 |

### 既有獎金機制

- `reward_rules` 表支援依 subject/student/global 分層匹配
- `create` API 自動計算獎金 → 建立 `transactions`（`transaction_type: 'earn'`）
- 支援 `manual_reward` 手動覆寫、`reward_type_id` 指定獎勵類型

### 既有頁面

- `/student/[id]/add-assessment` — 獨立頁面新增評量（文字表單 + 圖片上傳）
- `/student/[id]/assessment/[assessmentId]/edit` — 編輯現有評量
- `/student/[id]` StudentRecords — 評量記錄清單（含科目/類型過濾、分頁）

### 尚不存在的設施

| 設施 | 狀態 |
|---|---|
| `assessment_mistakes`（錯題歸檔表） | ❌ 不存在 |
| `assessment_import_jobs` | ❌ 不存在（AI 文件已規劃 schema） |
| `assessment_import_drafts` | ❌ 不存在（AI 文件已規劃 schema） |
| `assessment_import_mistake_drafts` | ❌ 不存在（AI 文件已規劃 schema） |
| `ai_provider_configs`（key 加密表） | ❌ 不存在 |
| `assessment-imports` storage bucket | ❌ 不存在 |
| Encryption 工具（AES-256-GCM） | ❌ 不存在 |
| Provider adapter 層 | ❌ 不存在 |
| Feature flag / 站台設定機制 | 部分存在（`site_settings` 表），需確認 |

---

## 待釐清決策點

### 🔴 Phase 0：範圍確認（必須先決策才能開始實作）

#### 1. MVP 檔案格式

> 文件建議：JPEG / PNG / WebP，PDF 列為第二階段。

**問題：** 是否確認 MVP 只做圖片格式？若需支援 PDF，需要額外的 PDF→image 轉換層。

#### 2. Storage bucket

> 文件建議：新增 private `assessment-imports` bucket，不混入 `goal-images`

**問題：** 是否確認新建 bucket？若確認，bucket 的訪問權限是純 private（僅 server 端存取），還是需要 frontend signed URL？

#### 3. 錯題歸檔粒度

> 文件選項：A) 只記題號與知識點  B) 包含原答案、正解、錯誤原因

**問題：** MVP 要選哪個？這直接影響：
- `assessment_import_mistake_drafts` 的欄位設計
- 正式 `assessment_mistakes` 表的 schema
- LLM prompt 中對錯題的要求程度

#### 4. 原始考卷保留策略

> 文件選項：永久保留 / 確認後刪除 / 保留 N 天

**問題：** 預設選哪個？這影響 storage 成本和管理邏輯。

#### 5. 每日/每月處理上限

> 文件未指定數字

**問題：** 需要具體數字，例如：
- 免費方案：每日 5 次？10 次？
- 是否需要每月上限？

---

### 🟡 Phase 1：AI Provider 選定

#### 6. 首選 Model 與備援 Model

> 文件只說「OpenRouter adapter」，未指定 model

**問題：**
- 首選 model？（需要支援 vision 能力讀取圖片）
- 備援 model？
- OpenRouter 的 vision model 推薦哪一個？
  - `openai/gpt-4o`（支援 vision）
  - `anthropic/claude-3.5-sonnet`（支援 vision）
  - `google/gemini-1.5-flash`（支援 vision）
  - `meta-llama/llama-3.2-90b-vision-instruct`

#### 7. Vercel Timeout 風險

> 文件說「若 Vercel route handler 已足夠，先用 process endpoint + 前端輪詢」

**問題：** Vercel free/pro tier 的 function timeout 各有上限：
- Free: 10s（部分地區）/ 60s
- Pro: 60s
OCR + LLM pipeline 很可能超過 timeout，是否需要一開始就規劃 queue worker 或 Edge Function？

---

### 🟠 Phase 2：資料表設計

#### 8. 考卷圖片是否也存到 `image_urls`

目前 `assessments.image_urls` 是 JSONB，格式為 `[{ url, path, size, width?, height? }]`。

**問題：** AI 匯入確認後，考卷原圖是否也寫入 `assessments.image_urls`？
- A) 是，與既有圖片欄位合併
- B) 否，獨立儲存，不混入既有圖片
- C) 依 `ai_assessment_keep_source_file` 設定決定

#### 9. `assessment_import_drafts.subject_id` 如何處理

AI 辨識出科目名稱後，需要對應到系統中的 `subjects.id`。

**問題：** 對應失敗時（系統沒有該科目 / 名稱模糊）：
- 是否允許 draft 留空 `subject_id`？
- 是否讓家長在確認時手動選擇科目？（這影響 draft 草稿畫面設計）

---

### 🔵 Phase 5：前端整合

#### 10. AI 匯入入口位置

> 文件說「在 `/student/[id]/add-assessment` 加入 AI 匯入入口」

**問題：** 具體的 UX 是？
- A) 在表單頂部加一個「AI 智能匯入」按鈕，點擊後切換到上傳模式
- B) 新增一個獨立 tab/切換（手動 / AI 匯入）
- C) 直接在上傳區域顯示「拍照上傳考卷，AI 自動填寫」

#### 11. 草稿確認後的獎金計算

> 文件說「確認後沿用既有獎勵規則建立交易」

**問題：** 
- AI 確認時，獎金是否**自動依既有規則計算**？
- 還是允許家長在確認前**手動調整獎金**？
- 是否需要支援 `reward_type_id` 選擇（指定獎勵類型）？

---

## 建議執行順序（修正版）

| 優先級 | 項目 | 依賴 |
|---|---|---|
| **P0** | 先釐清本文所有決策點 | 無 |
| **P1** | Phase 1：站台設定 + 金鑰加密 + feature flag | Phase 0 確認 |
| **P2** | Phase 2：資料表 migration + storage bucket | Phase 1 |
| **P3** | Phase 3：Provider adapter + JSON schema + Zod 驗證 | Phase 2 |
| **P4** | Phase 4：API routes（import → process → draft → confirm） | Phase 3 |
| **P5** | Phase 5：前端上傳 + 草稿確認畫面 | Phase 4 |
| **P6** | Phase 6：測試 + 手機驗收 | Phase 5 |

---

## 技術建議

1. **`image_urls` 型別同步**：目前 `lib/supabase/types.ts` 缺少此欄位，建議趁這次一起補上
2. **Score type 擴充**：現有 `score_type` 只有 numeric/letter，AI 匯入的草稿可能需要先統一為 numeric，在確認時再做轉換
3. **錯題資料表**：建議先設計正式 `assessment_mistakes` 表，AI 草稿確認後直接 INSERT，避免後續再 migration

---

## 建議決策答案（2026-05-19）

> 給實作模型的可執行結論：以下決策先作為 MVP 預設值；除非使用者另行覆寫，請依此往下實作。

### Phase 0：範圍確認

#### 1. MVP 檔案格式

**決策：MVP 只支援 JPEG / PNG / WebP。PDF、HEIC/HEIF 先不做。**

- 手機拍照通常可透過 browser camera capture 取得 JPEG，先滿足主要使用情境。
- 若使用者選到 PDF 或 HEIC/HEIF，前端顯示不支援提示，請使用照片格式上傳。
- PDF 需要 PDF rasterize 或外部 OCR pipeline，列入第二階段。
- 上傳前端需壓縮圖片，建議最長邊 2000px、JPEG quality 0.85，避免超過 Vercel request body 限制。

#### 2. Storage bucket

**決策：新增 private `assessment-imports` bucket。MVP 由 server API 上傳與讀取，不開 public read。**

- 不混用現有 `goal-images`，因為 `goal-images` 目前偏公開圖片用途，不適合考卷原圖。
- 前端上傳給 `/api/assessment-imports`，server 端用 admin client 寫入 private bucket。
- 草稿確認畫面優先用前端本地 preview；若需要重新開啟已上傳檔案，再由 API 產生短效 signed URL。
- signed URL 只給已授權使用者，且有效期應短，例如 5-15 分鐘。

#### 3. 錯題歸檔粒度

**決策：採 B，但欄位允許 nullable。MVP 記題號、學生答案、正解、錯誤類型、知識點、AI 說明與信心分數。**

建議欄位：

- `question_number`
- `student_answer`
- `correct_answer`
- `mistake_type`
- `knowledge_point`
- `ai_reason`
- `confidence`
- `raw_text` 或 `source_excerpt`

原因：使用者目標是「提取錯誤資訊歸檔」，只記題號與知識點太薄，後續複習價值不足。但 AI 不一定能穩定辨識所有答案，所以所有細節欄位都應允許空值，並交給家長確認時補齊。

#### 4. 原始考卷保留策略

**決策：預設保留 7 天，確認或拒絕後仍可由排程清理；站台可設定是否延長保留。**

- 預設不永久保留，降低學生資料與 Storage 風險。
- `ai_assessment_keep_source_file` 預設 `false`。
- `ai_assessment_source_retention_days` 預設 `7`。
- 使用者 reject 草稿時可立即刪除原始檔。
- 若未來要做「保留考卷圖供回看」，應另做 private image viewer，不要直接塞進 public image flow。

#### 5. 每日/每月處理上限

**決策：free / default 模式先用低上限。**

- 每站每日：10 次
- 每學生每日：3 次
- 每站每月：100 次
- 單檔上限：4 MB，前端需先壓縮
- 同一 job 重試上限：2 次

原因：OpenRouter 免費模型有低 rate limit 與不穩定風險；本功能使用頻率也不高，先保守保護成本與濫用風險。

### Phase 1：AI Provider 選定

#### 6. 首選 Model 與備援 Model

**決策：預設首選 `openrouter/free`，並讓設定頁可覆寫成指定 model。**

預設設定：

- `ai_assessment_provider`: `openrouter`
- `ai_assessment_model_primary`: `openrouter/free`
- `ai_assessment_model_fallback`: 空值，或使用者自行設定

實作注意：

- 呼叫後必須記錄 OpenRouter 實際回傳的 `model`，方便追蹤品質。
- 不要把某個 `:free` 模型硬寫死在程式中，因為免費模型可用性會變。
- 2026-05-19 查詢 OpenRouter Models API 時，仍有部分支援 image input 的 `:free` 模型，例如 NVIDIA / Gemma vision 類模型；但此清單不應成為固定依賴。
- 若使用者願意付費或需要穩定品質，可在設定中改成 `google/gemini-2.5-flash`、`google/gemini-3.1-flash-lite` 或其他支援 vision 的模型。

官方參考：

- OpenRouter free router: https://openrouter.ai/docs/guides/routing/routers/free-router
- OpenRouter models API: https://openrouter.ai/docs/guides/overview/models

#### 7. Vercel Timeout 風險

**決策：MVP 先不導入正式 queue worker，但 API 必須做成 job 狀態機 + 可重試；若 timeout 發生，再替換 process runner。**

- `/api/assessment-imports` 只負責建立 job 與上傳檔案。
- `/api/assessment-imports/[id]/process` 負責處理 OCR/LLM，前端輪詢 job 狀態。
- route handler 可設定 `maxDuration`，但不要假設所有部署方案都有相同 timeout。
- process endpoint 必須 idempotent：同一 job 不得重複建立草稿或正式資料。
- 若部署環境 timeout 不足，下一階段再改成 Vercel Cron / Supabase Edge Function / 外部 queue worker。

備註：Vercel 官方頁面對不同 plan、Fluid Compute 與 runtime 的 max duration 有不同表述；實作時請以當前專案實際部署設定為準。

官方參考：

- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Vercel Hobby plan comparison: https://vercel.com/docs/plans/hobby

### Phase 2：資料表設計

#### 8. 考卷圖片是否也存到 `image_urls`

**決策：MVP 選 B，不把 AI 匯入的原始考卷圖寫入 `assessments.image_urls`。**

- `assessment_import_jobs.source_file_path` 保存 private bucket path。
- `assessments.image_urls` 保持現有手動評量圖片用途。
- `ai_assessment_keep_source_file` 只控制 private import 原圖保留，不代表要出現在正式評量卡片。
- 若未來要把考卷圖展示在正式評量，需先把圖片展示改成 signed URL / private viewer，避免公開學生考卷。

#### 9. `assessment_import_drafts.subject_id` 如何處理

**決策：draft 允許 `subject_id` 為 null；confirm 時必須有 `subject_id`。**

- AI 可填 `detected_subject_name` 與候選 `subject_candidates`。
- 若名稱能高信心對應現有 `subjects.id`，草稿自動預填。
- 對應失敗或信心不足時，家長確認畫面必須手動選科目。
- `POST /api/assessment-imports/[id]/confirm` 若沒有 `subject_id`，回傳 400，不建立正式評量。

### Phase 5：前端整合

#### 10. AI 匯入入口位置

**決策：選 B，在 `/student/[id]/add-assessment` 做「手動新增 / AI 匯入」分段切換。**

- 功能關閉或不可用時，只顯示既有手動表單。
- 功能可用時，頁面頂部顯示 segmented control：`手動新增` / `AI 匯入`。
- AI 匯入頁面第一屏就是拍照/選檔，不做說明型 landing。
- 處理完成後進入草稿確認畫面；確認後導回學生評量記錄。

#### 11. 草稿確認後的獎金計算

**決策：預設自動沿用既有獎勵規則，但家長可在確認前手動覆寫獎金與獎勵類型。**

- confirm endpoint 應復用或抽出 `/api/assessments/create` 的核心建立邏輯，避免獎金算法分叉。
- 預設：依 `subject_id`、`assessment_type`、分數百分比套用現有 `reward_rules`。
- 草稿確認畫面提供：
  - 自動計算獎金預覽
  - `manual_reward` 覆寫欄位
  - `reward_type_id` 選擇
- confirm 只能執行一次；重複 confirm 不得建立第二筆 `assessments` 或 `transactions`。

---

## 決策後補充：站台設定 keys 完整清單

原始 TODO Phase 1 只列了 6 個 key，決策後需擴充為：

### Server env（不進 DB）

| Key | 說明 |
|---|---|
| `AI_PROVIDER_KEY_ENCRYPTION_SECRET` | AES-256-GCM 加密主密鑰 |
| `AI_PROVIDER_KEY_ACTIVE_VERSION` | 目前使用的 key version |

### 站台設定 keys（存 `site_settings`）

| Key | 預設值 | 說明 |
|---|---|---|
| `ai_assessment_import_enabled` | `false` | 功能總開關 |
| `ai_assessment_provider` | `openrouter` | AI provider |
| `ai_assessment_model_primary` | `openrouter/free` | 首選 model（vision/text 未指定時的 fallback） |
| `ai_assessment_model_vision` | (空) | Vision 專用 model（空白則用 model_primary） |
| `ai_assessment_model_text` | (空) | Text 分析專用 model（空白則用 model_primary） |
| `ai_assessment_model_fallback` | (空) | 備援 model |
| `ai_assessment_daily_limit` | `10` | 全站每日上限 |
| `ai_assessment_monthly_limit` | `100` | 全站每月上限 |
| `ai_assessment_student_daily_limit` | `3` | 每學生每日上限 |
| `ai_assessment_max_file_size_mb` | `4` | 單檔大小上限 |
| `ai_assessment_max_retries` | `2` | 同一 job 重試上限 |
| `ai_assessment_keep_source_file` | `false` | 是否保留原始考卷 |
| `ai_assessment_source_retention_days` | `7` | 原始檔保留天數 |

---

## 決策後補充：`assessment_mistakes` 正式表 schema

決策 #3 採方案 B，正式錯題歸檔表建議如下：

```sql
CREATE TABLE public.assessment_mistakes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    question_number text,
    student_answer text,
    correct_answer text,
    mistake_type text,
    knowledge_point text,
    ai_reason text,
    confidence numeric(3,2),
    created_at timestamp with time zone DEFAULT now()
);
```

備註：
- 所有細節欄位皆 nullable（AI 不一定能穩定辨識）
- `ON DELETE CASCADE`：評量刪除時自動清除錯題
- `assessment_import_mistake_drafts` 確認後 INSERT 到此表

---

## 最終執行指令

1. ~~先依本文件「建議決策答案」更新 `docs/AI_ASSESSMENT_IMPORT_TODO.md`。~~ ✅ 已完成
2. 先做 Phase 1 與 Phase 2，不要先碰前端大改。
3. 所有新正式 schema 需同步：
   - migration
   - `database/bootstrap/01_schema.sql`
   - `lib/supabase/types.ts`
   - 部署 / env 文件
4. AI 匯入永遠先產生草稿；家長確認前不得建立正式評量、錯題正式資料或交易。
5. 站台設定 key 以上方「完整清單」11 個為準，多於原始 TODO 的 6 個。
