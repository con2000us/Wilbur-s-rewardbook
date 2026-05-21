# AI 評量匯入實作驗收缺失與修正指令

> 日期：2026-05-20  
> 目的：交接給下一個模型修正目前 AI 評量匯入實作。  
> 結論：目前「設定頁、API key 加密保存、Vision/Text 測試按鈕」已大致可用，但「新增評量頁入口」沒有接上，端到端真考卷測試尚不可靠。請先完成本文件 P0/P1 修正，再測真考卷。

---

## 目前可確認已完成

- `設定 → AI 評量匯入設定` 已可設定：
  - Vision / 識圖 LLM provider
  - Vision endpoint
  - Vision API key
  - Vision model
  - Text / 文本 LLM provider
  - Text endpoint
  - Text API key
  - Text model
- `POST /api/settings/ai-provider-key` 已可將 API key 加密後寫入 DB。
- `POST /api/settings/ai-provider-key/test` 已新增：
  - Vision 測試會送一張包含 `VISION 42` 的測試圖片。
  - Text 測試會送短 prompt。
  - 不會回傳明文 API key。
- `/api/ai-assessment/status` 目前在本機回傳已就緒：

```json
{
  "enabled": true,
  "visionConfigured": true,
  "textConfigured": true,
  "dailyRemaining": 10,
  "monthlyRemaining": 100
}
```

- `npm run build` 已通過。

---

## P0：阻擋端到端測試的問題

### P0-1. 新增評量頁沒有接上 AI 匯入入口

**現象**

使用者到「新增評量」頁，看不到「手動新增 / AI 匯入」切換。

**根因**

AI 匯入 segmented control 寫在：

- `app/student/[id]/add-assessment/AddAssessmentForm.tsx`

但實際頁面載入的是：

- `app/student/[id]/add-assessment/page.tsx`
- 目前 import：`import AssessmentForm from '../components/AssessmentForm'`
- 目前 render：`<AssessmentForm ... />`

也就是說，`AddAssessmentForm.tsx` 目前不是實際頁面使用的 component。

**不要做的修法**

不要直接把 `page.tsx` 改成載入 `AddAssessmentForm.tsx`。

原因：`app/student/[id]/components/AssessmentForm.tsx` 才是目前 canonical form，且同時被新增與編輯流程使用。它比 `AddAssessmentForm.tsx` 新，包含更多既有功能，例如：

- `assessment` prop，支援編輯模式。
- `initialSubjectId`、`onSuccess`、`onCancel`。
- `reward_type_id` 選擇。
- 現有圖片上傳與獎勵預覽流程。

直接換成 `AddAssessmentForm.tsx` 可能會讓既有新增/編輯評量功能退化。

**建議修法**

把 AI 匯入 segmented control 合併進：

- `app/student/[id]/components/AssessmentForm.tsx`

且只在新增模式顯示：

```tsx
const isCreateMode = !assessment

{isCreateMode && aiAvailable && (
  <SegmentedControl>
    手動新增 / AI 匯入
  </SegmentedControl>
)}

{isCreateMode && activeMode === 'ai' ? (
  <AiAssessmentImport ... />
) : (
  原本 AssessmentForm 表單
)}
```

**驗收標準**

- `/student/[id]/add-assessment` 在 AI 設定就緒時顯示「手動新增 / AI 匯入」。
- `/student/[id]/assessment/[assessmentId]/edit` 不顯示 AI 匯入。
- AI 功能關閉或 key 未設定時，新增評量頁只顯示原本手動表單。
- 手動新增評量原本功能不退化：
  - 科目選擇
  - 評量類型
  - numeric / letter score
  - `manual_reward`
  - `reward_type_id`
  - 圖片上傳
  - 獎勵預覽

---

### P0-2. 家長編輯草稿後，直接確認不會帶入最新修改

**現象**

AI 草稿畫面允許家長改科目、標題、類型、分數、日期、備註，但如果家長改完後直接按「確認歸檔」，目前 `handleConfirm` 送的是空 body：

- `app/student/[id]/components/AiAssessmentImport.tsx`
- `handleConfirm`
- `body: JSON.stringify({})`

這會導致 confirm API 使用 DB 裡的舊草稿，而不是畫面上的最新值。除非家長先按「儲存草稿」，否則修改可能不會生效。

**建議修法，二選一**

方案 A：前端 confirm 前先自動 PATCH 草稿。

```tsx
await saveDraft()
await confirmDraft()
```

方案 B：`POST /api/assessment-imports/[id]/confirm` 接收 override payload，後端在同一個 transaction-like 流程中先更新 draft 再 confirm。

建議採 **方案 B**，因為比較不容易因前端漏呼叫而污染正式資料。

**confirm body 建議支援**

```json
{
  "subject_id": "...",
  "title": "...",
  "assessment_type": "exam",
  "score": 82,
  "max_score": 100,
  "assessment_date": "2026-05-20",
  "notes": "...",
  "manual_reward": 10,
  "reward_type_id": "..."
}
```

**驗收標準**

- 家長修改科目後直接按「確認歸檔」，正式 `assessments.subject_id` 是最新值。
- 家長修改分數後直接按「確認歸檔」，正式 `score/max_score/percentage/reward_amount` 是最新值。
- 家長修改日期後直接按「確認歸檔」，正式 `due_date` 是最新值。

---

### P0-3. 錯題草稿只能看，不能編輯

**現象**

`AiAssessmentImport` 目前錯題區塊只是 preview：

- `question_number`
- `mistake_type`
- `knowledge_point`
- confidence

但沒有提供編輯欄位。

**與原始 plan 的衝突**

原始設計要求家長確認前可編輯錯題資訊。AI 可能看錯題號、學生答案、正解、知識點，不能只讓家長看。

**建議修法**

在 review phase 中，每一筆 mistake draft 都應可編輯：

- 題號 `question_number`
- 學生答案 `student_answer`
- 正確答案 `correct_answer`
- 錯誤類型 `mistake_type`
- 知識點 `knowledge_point`
- AI 說明/家長備註 `ai_reason`

新增 API：

- `PATCH /api/assessment-imports/[id]/mistakes`

或擴充現有：

- `PATCH /api/assessment-imports/[id]/draft`

使其可同時更新 draft + mistake drafts。

**驗收標準**

- 家長能修改錯題題號。
- 家長能刪除 AI 誤判的錯題。
- 家長能新增 AI 沒抓到的錯題。
- 確認歸檔後，`assessment_mistakes` 寫入的是家長最後確認的內容。

---

### P0-4. `/process` 仍是長時間同步請求，timeout 風險未解除

**現象**

`AiAssessmentImport.handleUpload` 目前流程：

```tsx
POST /api/assessment-imports
await POST /api/assessment-imports/[id]/process
pollJob()
```

也就是前端會等待 `/process` 完成 Vision + Text 兩段模型呼叫，之後才開始 polling。

**問題**

這不符合原 plan 的 job/polling 設計。若 Vision + Text 超過 Vercel function timeout，整個 request 會失敗，前端 polling 也來不及發揮作用。

**建議修法**

MVP 如果先不導入 queue worker，至少應該讓 UX 和 API 行為接近 job 模式：

1. `POST /api/assessment-imports` 建 job 並回傳。
2. 前端立即進入 processing UI。
3. 觸發 `/process`，但不要讓 UI 等它完成才 polling。
4. 前端立即 polling `/api/assessment-imports/[id]`。

可先用：

```tsx
void fetch(`/api/assessment-imports/${jobId}/process`, { method: 'POST' })
pollJob(jobId)
```

但更好的方案是：

- `/process` 快速 mark job processing 後回應。
- 實際處理改到 background runner / queue / Supabase Edge Function / scheduled worker。

**驗收標準**

- 按「開始 AI 分析」後，UI 立即進入 processing。
- 即使 `/process` request 超過 20-60 秒，前端仍能透過 job status 顯示進度/失敗。
- 同一 job 重複觸發 `/process` 不會建立重複 draft。

---

### P0-5. Confirm route 沒復用既有評量建立邏輯，獎金口徑會分叉

**現象**

`app/api/assessment-imports/[id]/confirm/route.ts` 自己簡化計算 reward，沒有復用：

- `app/api/assessments/create/route.ts`

目前 confirm 的簡化邏輯可能與正式新增評量不同。

**風險**

- `manual_reward` 只有在匹配到 rule 時才可能生效；沒有匹配 rule 時可能被忽略。
- fallback reward 規則與 `/api/assessments/create` 不一致。
- `reward_type_id`、`category`、`transaction_date` 與正式流程不一致。
- `grade/score_type` 未處理。
- `reward_formula` 未處理或不完整。

**建議修法**

抽出共用 service，例如：

- `lib/assessments/createAssessmentWithReward.ts`

讓以下兩者共用同一個函式：

- `POST /api/assessments/create`
- `POST /api/assessment-imports/[id]/confirm`

共用函式應負責：

- 建立 `assessments`
- 計算 percentage
- 套用 reward rules
- 處理 `manual_reward`
- 處理 `reward_type_id`
- 建立 `transactions`
- 回傳 `assessment_id`、`reward_amount`、`transaction_id`

**驗收標準**

- 同一筆分數用手動新增與 AI confirm，獎金結果一致。
- `manual_reward` 在沒有匹配 rule 時也能覆寫。
- `reward_type_id` 正確寫進 transaction。
- `transaction_date` 與評量日期一致。

---

## P1：功能完整性與資料安全問題

### P1-1. 上傳 API 沒有真正阻擋每日/月用量上限

**現象**

`POST /api/assessment-imports` 只檢查：

- feature enabled
- vision/text configured
- file type
- file size

但沒有檢查：

- `dailyRemaining === 0`
- `monthlyRemaining === 0`
- 每學生每日上限

**建議修法**

在 `POST /api/assessment-imports` 中補：

- 全站每日上限
- 全站每月上限
- 每學生每日上限
- retry 次數上限

**驗收標準**

- 全站每日額度用完時，不能再建 job。
- 每學生每日額度用完時，不能再建 job。
- 錯誤訊息要能讓家長知道是額度問題，不是模型失敗。

---

### P1-2. 檔案大小限制硬寫死 4MB，沒有讀 site_settings

**現象**

前端與後端都硬寫死 4MB：

- `AiAssessmentImport.tsx`
- `app/api/assessment-imports/route.ts`

但 plan 裡有設定：

- `ai_assessment_max_file_size_mb`

**建議修法**

- 後端以上述 setting 為準。
- 前端可從 `/api/ai-assessment/status` 或新的 config endpoint 取得限制。
- 前端顯示與後端實際限制要一致。

---

### P1-3. AI provider key table 的 RLS 過度寬鬆

**現象**

`database/migrations/add-ai-assessment-configs.sql` 對 `ai_provider_configs` 設定了：

```sql
CREATE POLICY "Allow public read on ai_provider_configs"
  ON public.ai_provider_configs FOR SELECT USING (true);

CREATE POLICY "Allow insert on ai_provider_configs"
  ON public.ai_provider_configs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on ai_provider_configs"
  ON public.ai_provider_configs FOR UPDATE USING (true);

CREATE POLICY "Allow delete on ai_provider_configs"
  ON public.ai_provider_configs FOR DELETE USING (true);
```

**風險**

即使 API 不回傳明文 key，Supabase anon client 仍可能直接查到 `encrypted_api_key` ciphertext，甚至新增、更新、停用 key。這違反「API key 加密後存 DB，但只由 server 端管理」的安全原則。

**建議修法**

- `ai_provider_configs` 不應允許 public anon 直接 SELECT/INSERT/UPDATE/DELETE。
- 管理 API 應改用 `createAdminClient()` 或 server-only privileged client。
- 若專案暫時沒有完整 auth，至少要避免 browser 端直接用 Supabase anon key 操作這張表。

**驗收標準**

- 前端不能直接透過 Supabase anon select `encrypted_api_key`。
- 只有 server API 可以讀取並解密 provider key。
- 設定頁 API response 不含 `encrypted_api_key`。

---

### P1-4. 草稿與正式錯題資料表 RLS 也過度寬鬆

**現象**

`assessment_import_jobs`、`assessment_import_drafts`、`assessment_import_mistake_drafts`、`assessment_mistakes` 目前 RLS 都是 public allow。

**風險**

考卷內容、OCR text、錯題資料都屬於學生學習資料。若部署環境不是完全私有，這些 policy 會造成資料暴露風險。

**建議修法**

短期：

- 這些表只由 server route 存取。
- client 不直接 query 這些表。

中期：

- 若專案導入 auth，RLS 依 user/student ownership 收斂。
- 若維持單站家庭部署，至少搭配站台密碼保護與 server-only API。

---

### P1-5. Reject 只更新 draft，不更新 job status

**現象**

`POST /api/assessment-imports/[id]/reject` 只把 draft status 改成 `rejected`，沒有同步把 job status 改為 `cancelled` 或類似狀態。

**影響**

- job status 可能仍是 `completed`。
- 後續列表或額度統計容易混淆。

**建議修法**

reject 時同步：

```sql
assessment_import_jobs.status = 'cancelled'
```

或新增更明確狀態 `rejected`，但要同步更新所有 status check。

---

### P1-6. Confirm 後沒有更新 job status / confirmed metadata

**現象**

Confirm 後只把 draft status 改 `confirmed`，沒有在 job 上記錄：

- 已確認
- 正式 assessment id
- confirmed_at

**建議修法**

可在 `assessment_import_jobs` 增加：

- `confirmed_assessment_id uuid`
- `confirmed_at timestamptz`

或至少在 confirm 後更新 job metadata，方便 audit。

---

### P1-7. AI schema 沒有處理 OpenAI/新版 Responses 可能回傳的 content array

**現象**

`lib/ai/providers/openrouter.ts` 目前假設：

```ts
const content = data.choices?.[0]?.message?.content
JSON.parse(content)
```

若 provider 回傳 content array 或包在不同欄位，可能解析失敗。

**建議修法**

沿用 test route 的 `getAssistantText(content)` 思路，把 content normalize 成 string 後再處理。

---

## P2：體驗與可維護性問題

### P2-1. `AddAssessmentForm.tsx` 與 `AssessmentForm.tsx` 重複，會造成長期分叉

**現象**

目前有兩份新增評量表單：

- `app/student/[id]/components/AssessmentForm.tsx`
- `app/student/[id]/add-assessment/AddAssessmentForm.tsx`

第二份有 AI 匯入，但沒有被實際使用。

**建議修法**

- 將 AI 入口合併進 canonical `AssessmentForm.tsx`。
- 刪除或停止維護 `AddAssessmentForm.tsx`。
- 若仍要保留，文件需標明 deprecated，避免模型下次又改錯檔案。

---

### P2-2. AI 匯入成功後沒有自動導回/refresh

**現象**

確認成功後顯示成功畫面，提供連結回學生頁，但沒有自動 refresh 或 router navigation。

**建議**

可保留目前手動按鈕，但要確認返回學生頁後新評量一定顯示。若使用 `<a>`，可考慮改成 `router.push` + `router.refresh()`。

---

### P2-3. Vision/Text 測試成功不代表正式流程成功

**現象**

目前 Text 測試只測一般文字回應。正式流程會要求：

- `response_format: { type: 'json_object' }`
- JSON parse
- Zod schema validation

**建議**

設定頁增加第二階段測試：

- Text JSON 測試：餵固定 OCR text，要求模型回符合 schema 的 JSON。
- Vision OCR 測試：目前已用 `VISION 42` 圖片，比原本 1x1 空白圖好。

---

## 建議修正順序

### 第一批：先讓入口出現且不破壞手動表單

1. 把 AI segmented control 合併進 `components/AssessmentForm.tsx`。
2. 只在新增模式 `!assessment` 顯示 AI 匯入。
3. 停止使用或刪除 `add-assessment/AddAssessmentForm.tsx`。
4. 驗收：新增評量頁看到「AI 匯入」，編輯評量頁看不到。

### 第二批：讓家長確認真正可信

1. Confirm 前必須套用畫面上最新 draft 欄位。
2. 錯題草稿可編輯、新增、刪除。
3. Confirm API 寫入家長最後確認資料。

### 第三批：統一正式評量建立邏輯

1. 抽共用 assessment create service。
2. 手動新增與 AI confirm 共用 reward/transaction 邏輯。
3. 補測試：同分數、同科目、同規則，兩條路徑結果一致。

### 第四批：補安全與額度

1. 修 `ai_provider_configs` RLS，改 server-only 管理。
2. 補 daily/monthly/student daily quota。
3. 檔案大小限制改讀 site setting。
4. reject/confirm 同步更新 job metadata。

### 第五批：再做真考卷測試

1. 先用無個資假考卷。
2. 確認草稿內容正確。
3. 編輯草稿與錯題。
4. 確認歸檔。
5. 回學生頁檢查正式評量、交易、錯題資料。

---

## 測試清單

### UI 測試

- [ ] AI 關閉時，新增評量頁沒有 AI 匯入入口。
- [ ] AI key 未設定時，新增評量頁沒有 AI 匯入入口，或顯示不可用原因。
- [ ] AI key 設定且功能開啟時，新增評量頁顯示「手動新增 / AI 匯入」。
- [ ] 編輯評量頁不顯示 AI 匯入。
- [ ] 手動新增原功能正常。
- [ ] AI 匯入可上傳 JPEG/PNG/WebP。
- [ ] AI 匯入拒絕 PDF/HEIC/超過大小限制檔案。

### API 測試

- [ ] `/api/ai-assessment/status` 回傳 enabled/configured/quota。
- [ ] `/api/settings/ai-provider-key/test` Vision 可讀 `VISION 42`。
- [ ] `/api/settings/ai-provider-key/test` Text 可回短文字。
- [ ] `/api/assessment-imports` 在額度不足時拒絕建 job。
- [ ] `/api/assessment-imports/[id]/process` 重複觸發不建立重複 draft。
- [ ] `/api/assessment-imports/[id]/confirm` 重複 confirm 不建立重複 assessment/transaction。
- [ ] `/api/assessment-imports/[id]/reject` 會同步更新 job 狀態與依設定刪除原始檔。

### 資料測試

- [ ] AI 草稿確認前，`assessments` 不新增資料。
- [ ] AI 草稿確認前，`transactions` 不新增資料。
- [ ] AI 草稿確認前，`assessment_mistakes` 不新增資料。
- [ ] 確認後，`assessments` 正確新增。
- [ ] 確認後，`transactions` 與手動新增口徑一致。
- [ ] 確認後，`assessment_mistakes` 寫入家長最後確認的錯題。
- [ ] reject 後，正式資料不新增。

---

## 給下一個模型的明確指令

請先不要測真考卷，也不要再改 `add-assessment/AddAssessmentForm.tsx`。  
先做以下最小修正：

1. 在 `app/student/[id]/components/AssessmentForm.tsx` 整合 AI 匯入 segmented control。
2. 保留原手動表單，不要移除任何既有欄位。
3. 確保 AI 入口只在新增模式出現。
4. 修 confirm：直接按確認時必須使用畫面最新資料。
5. 修錯題：草稿錯題可編輯、新增、刪除。
6. 修 confirm reward：與 `/api/assessments/create` 共用建立/獎勵邏輯。
7. 補 quota check 與 RLS 安全問題。
8. 跑 `npm run build`。
9. 用無個資假考卷跑端到端。

完成後再回報：

- 修改了哪些檔案。
- 哪些 P0/P1 已完成。
- 哪些仍待辦。
- `npm run build` 結果。
- 假考卷端到端測試結果。
## 2026-05-20 修正狀態

本輪已直接修正原文件列出的端到端阻擋點，後續驗收請以實作為準：

- P0-1 已修：`app/student/[id]/components/AssessmentForm.tsx` 現在會在新增模式、AI 功能可用時顯示「手動新增 / AI 匯入」，編輯模式不顯示。
- P0-2 已修：`AiAssessmentImport` 的「確認歸檔」會送出畫面上最新的科目、標題、類型、分數、日期、備註、手動獎勵、獎勵類型與錯題草稿。
- P0-3 已修：錯題草稿可新增、刪除、編輯題號、學生答案、正確答案、錯誤類型、知識點與錯因說明；`PATCH /draft` 也會同步重寫錯題草稿。
- P0-4 已修：上傳建立 job 後前端立即進入 processing 並開始 polling，`/process` 改為背景觸發，不再等整個 Vision/Text 流程回來才輪詢。
- P0-5 已修：新增 `lib/assessments/createAssessmentWithReward.ts`，手動新增與 AI confirm 共用同一套正式評量、獎勵規則與交易建立邏輯。
- P1 部分已修：`POST /api/assessment-imports` 會檢查每日/月額度、每學生每日額度與 `ai_assessment_max_file_size_mb`；reject 會同步把 job 標成 `cancelled`。
- Provider robustness 已補：OpenRouter adapter 會處理 assistant content array 與 fenced JSON。
- Bootstrap 已補：`database/bootstrap/02_seed_defaults.sql` 會建立 AI 預設設定鍵與 private `assessment-imports` bucket；既有環境可補跑 `database/migrations/add-ai-assessment-storage-bucket.sql`。

已驗證：`npm run build` 通過。
