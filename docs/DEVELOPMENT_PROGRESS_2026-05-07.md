# Development Progress - 2026-05-07

## 今日討論重點
- 先以 Supabase 免費方案為基礎，優先實作「大型目標圖片」功能。
- 以有限資源策略設計圖片功能，避免過早開啟高成本的考試照片儲存。
- 後續提供可升級路徑：付費 Supabase 或自架 Docker Supabase。

## 檢查結果：Supabase 是否可只靠 `.env` 切換

### 結論
- 可以。現行專案 Supabase 連線是由環境變數提供：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 若改成其他 Supabase 服務（官方付費或自架 Docker），更新 `.env` 後重新啟動/重新部署即可生效。

### 補充注意
- 目前 `lib/supabase/client.ts` 與 `lib/supabase/server.ts` 都使用上述 public env 建立連線。
- 專案目前未使用 `SUPABASE_SERVICE_ROLE_KEY` 作為主流程連線。
- 在 Vercel 上變更 env 需要重新部署才能完整套用新值。
- 使用者口語說的「切換服務端口」，在專案中實際上對應的是「切換 Supabase URL endpoint」。

## 目前確認的開發方向（待辦）

### P1：資源模式設定（Resource Profile）
- 新增資源模式：
  - `free`
  - `pro`
  - `self_hosted`
- 依模式開關圖片相關功能與限制：
  - 是否開啟考試照片儲存
  - 單檔上限
  - 每學生/每月上傳上限
  - 預設壓縮與尺寸策略

### P2：網站移轉與備份功能補強
- 維持「改 `.env` 切換 Supabase」為主要切換方式（不做 UI 一鍵切換）。
- 備份流程升級為完整遷移：
  1. 資料庫 schema + data（SQL 或等價匯出）
  2. Storage 物件檔（圖片檔）
  3. 設定資料（站台初始化與模式設定）
- 匯入新站後提供基本健康檢查與資料一致性檢查。

## 下一步建議執行順序
1. 先完成 `free` 模式下的大型目標圖片 MVP（上傳、壓縮、顯示、刪除）。
2. 再加上資源模式開關，控制高成本圖片功能。
3. 最後補齊「DB + Storage」完整備份/還原流程。

## 安全性與權限檢查（先記錄，後續穩定期處理）

### 目前狀態
- 專案主流程目前未使用 `SUPABASE_SERVICE_ROLE_KEY`，server 端仍以 anon key 連線為主。

### 可能影響
- 系統管理型操作（初始化、全站備份還原、跨使用者資料維護、Storage 批次搬移）可能受 RLS 限制而失敗。
- 若為了通過上述流程而把 RLS policy 放寬，會增加資料暴露風險。

### 後續待辦（安全性專項）
- 規劃 server-only 的 admin client（僅管理用途 API 使用），並隔離一般使用流程 client。
- 盤點哪些 API 屬於管理操作，後續改由 service role 執行（不暴露到前端）。
- 增加管理型 API 的權限檢查與操作審計（最少需記錄操作人、時間、動作）。
- 補充安全驗收清單：RLS 驗證、敏感金鑰暴露檢查、備份還原權限測試。

