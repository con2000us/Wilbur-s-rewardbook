# P0 TODO - 最需優先處理

更新日期：2026-05-17

## 0. 大型目標設定與指派方式（P0 產品決策）

### 核心規則

- `/settings/rewards` 是大型目標的唯一設定入口。
- `goal_templates` 代表全域大型目標設定。未指派任何學生時，它就是可重複使用的模板。
- 從 settings 指派學生時，系統會把 `goal_templates` 的內容複製成該學生自己的 `student_goals`。
- `student_goals.template_id` 用來追溯來源模板，但學生目標的進度、起算日、完成狀態、完成圖片與交易消耗紀錄都獨立保存。
- 修改模板不自動覆蓋已建立的學生目標，避免歷史進度被全域設定意外改壞。

### 操作語意

- 新增大型目標：在 `/settings/rewards` 建立 `goal_templates`。
- 不指定學生：保留為模板，之後可複製或指派。
- 指定學生：為每位學生建立一筆 `student_goals`，並寫入 `template_id`。
- 複製：複製一份新的 `goal_templates`，再修改內容或改指派對象，用於模板循環利用。
- Restart：建立新的 `student_goals` 實例，起算日可重設，舊目標保留為歷史。
- Reset：針對既有 `student_goals` 清除完成狀態與消耗標記，是否重設起算日必須由 UI 明確選擇。
- Reassign student：不直接搬移舊學生進度；改為對新學生建立新的 `student_goals` 實例，舊學生紀錄保留。

### P0 實作範圍

- 新增 `student_goals.template_id`。
- settings 目標卡片可指派學生，指派時複製模板內容成學生目標。
- settings 目標卡片可複製模板後再修改。
- 學生頁不再作為大型目標新增入口，只顯示已指派到該學生的目標與進度。
- 大型目標累積獎勵進度與獎勵存摺共用同一套 reward type matching 口徑。

### 目前狀態（2026-05-17）

- 已完成 `goal_templates` 指派學生時建立 `student_goals` 的基本關聯流程。
- 已完成大型目標進度與獎勵存摺統計的計算口徑一致化。
- 已用臨時測試資料驗證：起算日、獎勵類型比對、完成後消耗、重新指派後進度重算皆符合預期。
- 舊資料處理目前不需要執行：已確認沒有學生頁殘留舊大型目標資料。

## 1. 大型目標資料模型設計失誤：模板與學生目標被拆成兩套資料

### 問題

- `/settings/rewards` 設定的大型目標目前存放在 `goal_templates` / `goal_template_event_links`。
- 學生頁 `/student/[id]/rewards` 的大型目標目前存放在 `student_goals`。
- 兩者目前沒有關聯欄位，例如 `student_goals.template_id`。
- 使用者會自然理解為「設定頁建立的大型目標，可以在學生頁使用」，但目前實際上是兩套獨立資料，造成 UX 誤導。

### 影響

- 在設定頁新增/編輯大型目標，不會影響任何學生頁的大型目標。
- 學生頁新增的大型目標也不會回寫或連到模板。
- 後續進度、完成、圖片、起算時間、追蹤條件都會變成兩套邏輯，維護成本會快速上升。

### 優先處理方式

- 將 `/settings/rewards` 的大型目標明確定位為「大型目標模板」。
- 在 `student_goals` 新增 `template_id uuid null references goal_templates(id)`。
- 學生頁新增大型目標時，提供「從模板套用」流程。
- 套用模板時，把模板內容複製成學生自己的 `student_goals`，學生目標保留獨立進度、起算時間、完成狀態與圖片。
- UI 文案需避免誤導：設定頁是模板，學生頁是實際追蹤中的目標。

### 驗收標準

- `/settings/rewards` 新增的模板能在學生頁被選取並套用。
- 套用後 `student_goals.template_id` 可追溯來源模板。
- 修改模板不會自動破壞既有學生進度；若要同步，需另做明確操作。
- 文件清楚說明 `goal_templates` 與 `student_goals` 的差異。

## 2. 大型目標累積獎金進度與獎勵存摺總累積計算口徑不一致

### 問題

- 大型目標進度目前主要由 `/api/student-goals/list` 與 `/api/student-goals/[id]/progress` 計算。
- 獎勵管理/獎勵明細中的總累積主要由 `/api/students/[id]/reward-stats` 計算。
- 兩邊目前不是同一套公式。

### 目前差異

- 大型目標只認 `transactions.reward_type_id = goal.tracking_reward_type_id`。
- `reward-stats` 會先認 `reward_type_id`，若舊資料缺 `reward_type_id`，會再用 `category` / `display_name` / `type_key` 補認。
- 大型目標會套用 `tracking_started_at` 起算日；獎勵存摺的總累積通常是全歷史口徑。
- 大型目標只算 `transaction_type in ('earn', 'bonus')`；部分存摺統計仍有 `amount > 0` 的舊口徑。
- 大型目標一般模式會依 `consumed_by_goal_id` 排除已消耗交易；里程碑模式則可能保留已消耗交易。

### 優先處理方式

- 抽出共用的 reward transaction matching/calculation 工具，避免各 API 自己寫一套。
- 大型目標的「追蹤獎勵類型」判斷應與 `reward-stats` 對齊：先用 `reward_type_id`，必要時用 `category` 補認舊資料。
- 大型目標仍保留自己的規則：`tracking_started_at`、`consume_on_complete`、`consumed_by_goal_id`。
- 舊交易補資料目前不執行：已確認沒有需要 backfill 的舊資料，之後若匯入舊資料再重新評估。
- 保留/整理差異集合 SQL，用於修正前後比對。

### 驗收標準

- 同一學生、同一獎勵類型下，無起算日且非已消耗資料時，大型目標累積值應與獎勵明細總累積一致。
- 有起算日的大型目標，差異只應來自起算日排除的交易。
- 舊資料缺 `reward_type_id` 但 `category` 可辨識時，大型目標應能納入計算；目前因沒有舊資料，此項暫列為相容保護而非必要驗收。
- 新增測試或至少保留 SQL 檢查腳本，能列出 `reward_stats_only` / `goal_progress_only` 的差集合。
