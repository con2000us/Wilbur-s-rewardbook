# AI 評量匯入 TODO

> 狀態：已完成產品流程定義，尚未實作。此功能為選用功能，預設關閉；既有手動新增評量流程必須保持可用。
> 
> 實作驗收缺失與修正優先順序請先看：`docs/AI_ASSESSMENT_IMPORT_IMPLEMENTATION_REVIEW.md`。目前端到端真考卷測試前，必須先修該文件列出的 P0 問題。

## 產品決策

- 手機端拍照或上傳 PDF/圖片後，系統建立匯入任務。
- 後端負責呼叫 OCR / vision model 與 LLM，模型不得直接呼叫正式歸檔 API。
- LLM 只產生結構化 JSON 草稿；後端必須做 schema 驗證、資料正規化與錯誤處理。
- 家長看到「待確認草稿」後，可以編輯科目、成績、滿分、日期、名稱、錯題資訊與備註。
- 家長確認後才建立正式 `assessments`、錯題歸檔資料與必要的獎勵交易。
- 功能可在設定中關閉；沒有 provider API key 或缺少 server 加密密鑰時，前端不顯示或停用 AI 匯入入口。
- **API key 需求（開放式架構）：本系統支援兩組獨立的 API key + 端點設定**
  - **① 識圖 LLM（Vision）**：圖片 → OCR 文字，需要一組 key + endpoint
  - **② 文本 LLM（Text）**：OCR 文字 → 結構化 JSON，需要一組 key + endpoint
  - 兩者可為同一組 key（`purpose='both'`），也可各自使用不同的 provider/model
  - 建議使用 OpenRouter（統一管理多模型），也可直接使用 OpenAI / Anthropic / Google 原生 API

## 建議流程

```txt
手機拍照 / 上傳檔案
→ POST /api/assessment-imports
→ 建立 assessment_import_jobs
→ 上傳原始檔到 private storage path
→ 後端 process endpoint 或 queue worker 觸發 OCR / vision model
→ LLM 依 OCR 結果與學生上下文產生 JSON
→ Zod / JSON Schema 驗證
→ 寫入 assessment_import_drafts 與 assessment_import_mistake_drafts
→ 前端輪詢任務狀態並顯示待確認草稿
→ 家長編輯 / 確認
→ POST /api/assessment-imports/[id]/confirm
→ 建立正式評量、錯題資料與獎勵交易
```

## Phase 0：範圍確認 ✅ (已完成決策，見 `docs/AI_ASSESSMENT_IMPORT_CLARIFICATION.md`)

- [x] ~~MVP 檔案格式~~ → JPEG / PNG / WebP，不做 PDF / HEIC。前端壓縮最長邊 2000px，JPEG quality 0.85。
- [x] ~~Storage bucket~~ → 新建 private `assessment-imports` bucket，不混入 `goal-images`。server 端上傳，frontend 用 signed URL。
- [x] ~~錯題歸檔粒度~~ → 方案 B：含題號、學生答案、正解、錯誤類型、知識點、AI 說明、信心分數。所有欄位 nullable。
- [x] ~~原始考卷保留策略~~ → 預設保留 7 天，可設定延長。`ai_assessment_keep_source_file` 預設 `false`。reject 時立即刪除。
- [x] ~~每日/每月處理上限~~ → 站每日 10 次／學生每日 3 次／站每月 100 次／單檔 4MB／同一 job 重試 2 次。

## Phase 1：設定與金鑰

- [ ] 新增站台設定 keys（13 個，見 `CLARIFICATION.md` 完整清單）：
  - `ai_assessment_import_enabled` (default: `false`)
  - `ai_assessment_provider` (default: `openrouter`)
  - `ai_assessment_model_primary` (default: `openrouter/free`)
  - `ai_assessment_model_vision` (default: 空 — 使用 model_primary)
  - `ai_assessment_model_text` (default: 空 — 使用 model_primary)
  - `ai_assessment_model_fallback` (default: 空)
  - `ai_assessment_daily_limit` (default: `10`)
  - `ai_assessment_monthly_limit` (default: `100`)
  - `ai_assessment_student_daily_limit` (default: `3`)
  - `ai_assessment_max_file_size_mb` (default: `4`)
  - `ai_assessment_max_retries` (default: `2`)
  - `ai_assessment_keep_source_file` (default: `false`)
  - `ai_assessment_source_retention_days` (default: `7`)
- [ ] 新增 server env：
  - `AI_PROVIDER_KEY_ENCRYPTION_SECRET`
  - `AI_PROVIDER_KEY_ACTIVE_VERSION`
- [ ] 新增 provider key 設定表，例如 `ai_provider_configs`：
  - `provider`
  - `label`
  - `encrypted_api_key`
  - `key_version`
  - **`purpose`：`'vision'`（識圖）、`'text'`（文本）、`'both'`（共用）**
  - **`endpoint_url`：自訂 API 端點（可空，使用 provider 預設）**
  - `is_active`
  - `created_at`
  - `updated_at`
- [ ] 實作 server-only 加密工具：AES-256-GCM，密文需包含 IV 與 auth tag。
- [ ] 實作 key rotation 預留欄位：新 key 加密新資料，舊 key 可用 version 解密舊資料。
- [ ] 設定頁只顯示 key 是否已存在、最後更新時間與 provider，不回傳明文 key。

## Phase 2：資料表與 Storage

- [ ] 新增 `assessment_import_jobs`：
  - `id`
  - `student_id`
  - `source_file_path`
  - `source_file_mime`
  - `source_file_size`
  - `status`
  - `raw_ocr_text`
  - `ai_json`
  - `validated_json`
  - `provider`
  - `model`
  - `error_code`
  - `error_message`
  - `created_at`
  - `updated_at`
  - `completed_at`
- [ ] 新增 `assessment_import_drafts`：
  - `job_id`
  - `student_id`
  - `subject_id`
  - `detected_subject_name`
  - `title`
  - `assessment_type`
  - `score`
  - `max_score`
  - `percentage`
  - `assessment_date`
  - `notes`
  - `confidence`
  - `status`
- [ ] 新增 `assessment_import_mistake_drafts`：
  - `draft_id`
  - `question_number`
  - `student_answer`
  - `correct_answer`
  - `mistake_type`
  - `knowledge_point`
  - `ai_reason`
  - `confidence`
- [ ] 新增 `assessment_mistakes`（正式錯題歸檔，CLARIFICATION.md 決策 #3）：
  - `id` uuid PK
  - `assessment_id` uuid FK → assessments(id) ON DELETE CASCADE
  - `question_number` text
  - `student_answer` text
  - `correct_answer` text
  - `mistake_type` text
  - `knowledge_point` text
  - `ai_reason` text
  - `confidence` numeric(3,2)
  - `created_at` timestamptz
- [ ] 更新 `database/bootstrap/01_schema.sql` 與必要 migration。
- [ ] 補 Storage 設定文件：private bucket、檔案大小限制、刪除策略、RLS / service role 使用方式。

## Phase 3：AI 服務層

- [ ] 建立 `lib/ai/providers/openrouter.ts` adapter。
- [ ] 建立 provider 介面，避免 API route 綁死 OpenRouter：
  - `analyzeAssessmentImage(input)`
  - `extractAssessmentJson(input)`
  - `healthCheck()`
- [ ] 設計 LLM JSON schema：
  - `subject`
  - `title`
  - `assessment_type`
  - `score`
  - `max_score`
  - `assessment_date`
  - `mistakes[]`
  - `uncertainties[]`
  - `confidence`
- [ ] 用 Zod 驗證模型輸出，並拒絕多餘欄位或不合理分數。
- [ ] 建立學生上下文 builder，只提供最小必要資料：
  - 年級
  - 候選科目
  - 近期課程進度
  - 近期評量名稱模式
- [ ] 失敗時保留 job 與 error，不建立草稿。
- [ ] 模型不可接收 service role key、DB URL、provider API key 或任何管理憑證。

## Phase 4：API

- [ ] `GET /api/ai-assessment/status`：回傳功能是否可用、停用原因與每日剩餘額度。
- [ ] `POST /api/settings/ai-provider-key`：新增或更新加密 provider key。
- [ ] `POST /api/assessment-imports`：建立 job 並上傳原始檔。
- [ ] `POST /api/assessment-imports/[id]/process`：處理 OCR / LLM，可由上傳後立即觸發或後續 queue 觸發。
- [ ] `GET /api/assessment-imports/[id]`：取得狀態、草稿與錯題草稿。
- [ ] `PATCH /api/assessment-imports/[id]/draft`：家長編輯草稿。
- [ ] `POST /api/assessment-imports/[id]/confirm`：確認後建立正式紀錄。
- [ ] `POST /api/assessment-imports/[id]/reject`：放棄草稿，依設定刪除原始檔。
- [ ] 所有 API 都要檢查 feature flag、key 狀態、學生歸屬與檔案上限。

## Phase 5：前端

- [ ] 在 `/student/[id]/add-assessment` 加入「AI 匯入」入口；功能關閉時不干擾手動表單。
- [ ] 建立手機友善的上傳 UI：拍照、選檔、預覽、重新上傳。
- [ ] 建立處理中畫面：狀態、可取消、失敗可重試。
- [ ] 建立草稿確認畫面：
  - 科目選擇
  - 成績 / 滿分
  - 評量名稱
  - 日期
  - 評量類型
  - 錯題清單
  - AI 信心與不確定項目提示
- [ ] 家長確認後導回學生評量頁，並顯示新評量與錯題資料。
- [ ] 在設定頁加入 AI 功能開關、provider/model 設定與 key 狀態。

## Phase 6：驗證與防呆

- [ ] 單元測試：加密/解密、錯 key 失敗、key version 解密。
- [ ] 單元測試：JSON schema 驗證，包含缺欄位、分數超過滿分、空錯題。
- [ ] API 測試：未開啟功能、沒有 key、超過上限、檔案太大、模型回傳壞 JSON。
- [ ] API 測試：confirm 只能執行一次，重複 confirm 不得建立重複評量或交易。
- [ ] E2E 測試：fake provider 回傳固定 JSON，完成上傳 → 草稿 → 編輯 → 確認。
- [ ] 手機版驗收：拍照上傳、處理中、草稿編輯、確認歸檔。
- [ ] 隱私驗收：前端 response 不含明文 API key；server log 不印出 key 或完整學生敏感資料。

## MVP 驗收標準

- [ ] 功能關閉時，使用者仍可完整使用手動新增評量。
- [ ] 功能開啟但沒有 provider key 時，AI 匯入入口顯示不可用原因或不顯示。
- [ ] 上傳一張清楚考卷照片後，可以產生待確認草稿。
- [ ] 家長能修改 AI 辨識出的科目、分數、滿分、日期、名稱與錯題。
- [ ] 家長確認前，不會建立正式 `assessments` 紀錄。
- [ ] 家長確認後，正式評量與錯題資料完成歸檔，並沿用既有獎勵規則建立交易。
- [ ] 模型輸出不合法時，系統顯示可理解的錯誤，不污染正式資料。
- [ ] 原始圖片保留或刪除符合站台設定。

## 暫不做

- [ ] 不在 MVP 做多模型自動評分比較。
- [ ] 不在 MVP 做完全背景 queue 平台切換；若 Vercel route handler 已足夠，先用 process endpoint + 前端輪詢。
- [ ] 不讓 AI 自動修正既有正式評量。
- [ ] 不把 provider API key 傳到瀏覽器。
## 2026-05-20 實作狀態摘要

已完成並可進入真考卷人工驗收：

- 設定頁 Vision/Text key 與測試按鈕。
- 新增評量頁 AI 匯入入口，僅在新增模式與 AI 可用時顯示。
- 上傳 job、processing 輪詢、草稿顯示、草稿欄位編輯。
- 錯題草稿新增、刪除、編輯與確認後正式歸檔。
- 確認歸檔前不建立正式資料；確認後建立 `assessments`、`transactions`、`assessment_mistakes`。
- 手動新增與 AI confirm 共用同一套獎勵建立邏輯。
- 每日/月額度、每學生每日額度、檔案大小限制、reject job 狀態同步。
- Bootstrap defaults 已補 AI 設定鍵與 private `assessment-imports` bucket。

待真機/真資料驗收：

- 用手機拍照上傳實際考卷，確認 OCR 與 JSON 抽取品質。
- 驗證 OpenRouter 不同 vision/text 模型的穩定度與錯誤訊息。
- 若既有 Supabase 專案尚未建立 private bucket，補跑 `database/migrations/add-ai-assessment-storage-bucket.sql`。
