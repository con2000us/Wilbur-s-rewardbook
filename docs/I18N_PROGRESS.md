# 國際化與介面一致化進度

更新日期：2026-04-30

## 目前結論

目前專案已從「純 i18n 導入」進入「i18n + 亮色主題一致化」整合階段。  
近期本地變更已完成多個核心頁面與彈窗的樣式統一，並移除部分 dark-mode 相依樣式。

## 已完成項目

### 1) i18n 核心能力（已完成）

- `next-intl` 已導入並可運作。
- 翻譯檔已建立：`locales/zh-TW.json`、`locales/en.json`。
- i18n 設定檔已建立：`lib/i18n/config.ts`、`lib/i18n/request.ts`。
- Cookie 語言切換流程可用（設定頁切換語言後可生效）。

### 2) 亮色主題共用 token（已完成）

- `app/globals.css` 已新增：
  - `.bg-app-shell`：全站亮色背景層
  - `.modal-backdrop`：彈窗遮罩統一色
- 既有滾動條顏色已調整為亮色主題可讀版本。

### 3) 已完成的主要頁面/元件收斂（本輪）

- 首頁與導覽控制列：`app/components/HomePageClient.tsx`、`app/components/LanguageToggle.tsx`、`app/components/LogoutButton.tsx`。
- 設定頁與登入頁：`app/settings/page.tsx`、`app/login/page.tsx`。
- 多個彈窗遮罩統一：`app/components/Modal.tsx`、`app/components/GlobalAddRewardPopup.tsx`、`app/student/[id]/rewards/*Popup*.tsx`、`app/student/[id]/rewards/RewardDetailModal.tsx`。
- 科目/交易/學生新增相關返回與操作按鈕已改為 `bg-primary`：`app/student/[id]/subjects/...`、`app/student/[id]/transactions/...`、`app/students/add/page.tsx`。
- 列印按鈕樣式已移除 dark mode 特例並對齊主色：`app/student/[id]/print/PrintButtons.tsx`。

### 4) 首頁行為調整（本輪）

- `app/components/HomePageClient.tsx` 已移除首頁上的全域新增獎勵入口與對應 popup 掛載。

## 仍需持續追蹤

以下是下一階段建議優先檢查區塊（以實際 UI 驗收為準）：

1. 學生詳情主流程頁（摘要、分頁、統計卡）是否完全套用亮色 token 與一致字色。
2. 表單頁（新增/編輯）是否仍有散落的 `bg-gray-*`、`bg-blue-*`、深色遮罩或 dark mode 條件樣式。
3. 列印相關頁面在手機與桌面下的按鈕可讀性、對比與 hover/focus 一致性。
4. 多語文本是否仍存在硬編碼字串（特別是提示訊息與空狀態文案）。

## 驗收檢查清單

### i18n
- [ ] 設定頁切換語言後，首頁與主要按鈕文案同步切換。
- [ ] 中英文下無明顯未翻譯 key 或 fallback key 顯示。

### UI 一致性
- [ ] 主要頁背景統一使用 `.bg-app-shell` 或明確亮色背景。
- [ ] 彈窗遮罩統一使用 `.modal-backdrop`。
- [ ] 主要操作按鈕色彩統一（以 `bg-primary` 為主）。
- [ ] 不新增 `dark:` 類別與 `.dark` 規則。

## 參考文件

- 詳細本地變更盤點：`docs/DEVELOPMENT_PROGRESS_2026-04-30.md`
- i18n 導入規劃：`docs/I18N_IMPLEMENTATION_PLAN.md`

