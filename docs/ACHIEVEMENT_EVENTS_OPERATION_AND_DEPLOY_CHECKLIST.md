# Achievement Events 操作與部署檢查

更新日期：2026-05-04

## 目標

這份文件提供：

1. Achievement Events（成就事件）日常操作流程
2. 資料庫部署順序與 SQL 檢查點
3. 上線後驗收 checklist（API + UI + 資料一致性）

---

## 一、功能範圍

Achievement Events 目前涵蓋：

- 事件模板管理（新增、編輯、刪除、排序）
- 事件對應獎勵規則（`achievement_event_reward_rules`）
- 交易紀錄關聯欄位：
  - `transactions.reward_type_id`
  - `transactions.achievement_event_id`

相關頁面與 API：

- 頁面：`/achievement-events`
- API：
  - `POST /api/achievement-events/create`
  - `POST /api/achievement-events/update`
  - `POST /api/achievement-events/delete`
  - `GET /api/achievement-events/list`

---

## 二、資料庫部署順序（建議）

請依序在 Supabase SQL Editor 執行：

1. `database/migrations/add-custom-reward-types-manager.sql`
2. `database/migrations/add-default-reward-types.sql`
3. `database/migrations/ensure-five-default-reward-types.sql`
4. `database/migrations/add-achievement-events-and-reward-type-links.sql`
5. `database/migrations/add-achievement-events-rls-read-policies.sql`
6. `database/migrations/backfill-transactions-reward-type-id.sql`
7. `database/migrations/seed-default-achievement-events.sql`

若要啟用兌換規則完整流程，再加跑：

8. `database/migrations/add-exchange-rules-complete.sql`
9. `database/migrations/update-exchange-rules-for-type-to-type.sql`

---

## 三、部署前檢查

- [ ] `custom_reward_types` 已有預設 5 種（`points/money/hearts/stars/diamonds`）
- [ ] `achievement_events` 表存在且可讀寫
- [ ] `achievement_event_reward_rules` 表存在且可讀寫
- [ ] `transactions` 具備 `reward_type_id`、`achievement_event_id` 欄位
- [ ] 既有交易已完成 `reward_type_id` 回填（舊資料不再全是 NULL）
- [ ] 本機 `npm run build` 可通過

---

## 四、操作流程（管理者）

### A. 新增事件

1. 進入 `/achievement-events`
2. 建立事件名稱（至少 `name_zh`）
3. 指定一筆以上獎勵規則（建議至少 1 筆 `is_default = true`）
4. 儲存後確認事件出現在列表

### B. 編輯事件

1. 修改事件欄位（名稱、描述、排序、啟用狀態）
2. 更新對應獎勵規則（會先刪舊規則再重建）
3. 儲存後重新整理確認資料一致

### C. 刪除事件

1. 刪除事件模板
2. 確認關聯規則自動清除（`ON DELETE CASCADE`）
3. 既有交易若保留 `achievement_event_id` 需由業務邏輯決定是否清理

---

## 五、上線後驗收 Checklist

### API 驗收

- [ ] `GET /api/achievement-events/list` 回傳 `events` 與 `rules`
- [ ] `create` 後 `event.id` 可建立對應規則
- [ ] `update` 後規則數量與內容符合表單輸入
- [ ] `delete` 後事件在列表消失

### UI 驗收

- [ ] `/achievement-events` 可正常顯示事件與規則
- [ ] 新增/編輯彈窗可儲存
- [ ] 刪除後列表與統計即時更新
- [ ] 亮色風格一致（不引入 `dark:`）

### 資料一致性驗收

- [ ] 新增交易時可寫入 `reward_type_id`
- [ ] 事件相關交易可寫入 `achievement_event_id`
- [ ] Reward 頁、交易頁、詳情彈窗顯示單位一致

---

## 六、常見問題

### 1) Build 報 `No overload matches this call` / `never`

通常是 Supabase 型別推斷與新表不同步。先確認：

- migration 已實際套用
- `lib/supabase/types.ts` 已包含新表結構
- 再執行 `npm run build` 重新驗證

### 2) API 成功但 UI 沒顯示

優先檢查：

- list API 是否回傳 `is_active = true` 的事件
- 頁面有沒有被舊快取資料覆蓋（重新整理或重啟 dev server）

---

## 七、建議的回歸測試最小集合

1. 新增一個事件（含 2 筆規則）
2. 編輯事件名稱與規則
3. 用事件建立一筆交易
4. 確認交易頁 / reward 頁能看到對應資料
5. 刪除事件並確認不影響既有非事件交易流程
