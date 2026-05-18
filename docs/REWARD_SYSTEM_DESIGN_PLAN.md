# 🎯 Wilbur's Reward Book — 獎勵系統設計規劃書

> 版本：v1.3
> 日期：2026-05-11
> 狀態：規劃稿（待審查）
> 變更：v1.3 — 獎勵規則（評量分數→獎勵）由科目層級管理，不納入全域獎勵中心。全域獎勵中心聚焦於非評量的行為獎勵管理。Tab 縮減為 4 個：①類型→②事件→③大型目標→④小型兌換
> v1.2 — 修正核心概念：大型目標是「獎勵」（🏖️海邊玩、🚲腳踏車），不是「行為」（考試滿分）。成就事件是行為標籤，大型目標是終極大獎。Layer 順序調整為 ①類型→②事件→③大型目標→④規則→⑤交易→⑥兌換
> 前身文件：`docs/latest_plan.md`、`docs/REWARD_GOALS_PAGE_WIREFRAME.md`

---

## 一、專案使命

> **Wilbur's Reward Book 的核心使命：透過目標設定與獎勵機制，激勵學生主動學習與正向行為。**

這句話決定了所有設計決策的優先級：任何功能都必須服務於「激勵學生」這個最終目的。

---

## 二、獎勵的生命週期（The Motivation Cycle）

從使用者（學生 + 家長）的角度，核心邏輯是：**做優良行為 → 獲得點數 → 累積點數 → 兌換獎勵**

```
  ┌─────────────────────────────────────────────────────────┐
  │                    學生視角的循環                         │
  │                                                         │
  │   ① 做優良行為              ② 獲得點數                   │
  │   ────────────             ──────────                   │
  │   考試滿分、作業優良    →    ⭐+30  💰+50               │
  │   幫助同學、進步顯著                                     │
  │         │                                               │
  │         ▼                                               │
  │   ③ 點數累積                                            │
  │   ──────────                                            │
  │   目前餘額：640⭐                                        │
  │         │                                               │
  │         ├──────────────────────────────────────┐        │
  │         ▼                                      ▼        │
  │   ④a 兌換小型獎勵                        ④b 存到大型目標 │
  │   ────────────                          ────────────    │
  │   🧱 樂高積木 200⭐                      🏖️ 海邊玩 2000⭐│
  │   立即兌換                              進度條 32%      │
  │   (日常滿足)                            (長期激勵)      │
  │         │                                      │        │
  │         └──────────────────┬───────────────────┘        │
  │                            ▼                            │
  │                    ⑤ 回到步驟①                           │
  │                    繼續努力、累積更多                      │
  └─────────────────────────────────────────────────────────┘
```

**大型目標與小型兌換的區別**：

| | 大型目標 | 小型兌換 |
|---|---|---|
| **本質** | 終極大獎（長期激勵） | 日常獎品（即時滿足） |
| **舉例** | 🏖️ 海邊一日遊、🚲 新腳踏車、🎮 遊戲主機 | 🧱 樂高積木、🍕 披薩、🎫 免作業券 |
| **所需點數** | 很高（如 2000⭐） | 較低（如 50⭐） |
| **達成頻率** | 幾個月一次 | 隨時可兌換 |
| **進度追蹤** | 有進度條，「還差多少」 | 無進度條，餘額夠就換 |
| **心理作用** | 給學生一個遠大目標，持續努力 | 維持日常動力，即時獎勵 |

---

## 三、系統中「獎勵」的六個層級（定義釐清）

獎勵系統由六個層級構成，從抽象到具體。核心概念：**成就事件 = 行為，大型目標 = 獎勵**。

```
  設定順序（由上而下）                  層級關係
  ────────────────────                ────────
  ① 獎勵類型     定義貨幣              基礎層（所有層都引用它）
  ② 成就事件     定義行為              學生做了什麼 → 獲得點數
  ③ 大型目標     定義終極大獎           學生存夠點數 → 得到大獎
  ④ 獎勵規則     定義自動計算           分數 → 自動獲得點數
  ⑤ 交易記錄     帳本                 所有收支明細
  ⑥ 小型兌換     定義日常兌換           小額點數 → 立即換小獎品
```

### Layer 1：獎勵類型（Reward Types）—「什麼貨幣」

| 項目 | 說明 |
|------|------|
| **是什麼** | 可以累積、花費、兌換的「貨幣單位」 |
| **舉例** | ⭐點數 / 💰金錢 / ❤️愛心 / 🌟星星 / 💎鑽石 |
| **誰管理** | 家長在獎勵中心管理（可自訂新增類型） |
| **系統預設** | 5 種：points, money, hearts, stars, diamonds |
| **資料表** | `custom_reward_types` |
| **管理位置** | `/settings/rewards` Tab ① |

### Layer 2：成就事件（Achievement Events）—「什麼行為」

| 項目 | 說明 |
|------|------|
| **是什麼** | 定義「學生做了什麼值得獎勵的事」，用於快速記錄獎勵時選取 |
| **舉例** | 🏆考試滿分 / 📝作業優良 / 🤝幫助同學 / 📈進步顯著 / ⭐準時交作業 |
| **本質** | 行為標籤 — 描述學生的優良行為，不是獎勵本身 |
| **誰管理** | 家長在獎勵中心建立 |
| **資料表** | `achievement_events` + `achievement_event_reward_rules` |
| **管理位置** | `/settings/rewards` Tab ② |

### Layer 3：大型目標（Big Goals）—「終極大獎」🆕

| 項目 | 說明 |
|------|------|
| **是什麼** | 家長預先定義的「大型獎勵模板」，需要長時間累積點數才能達成 |
| **舉例** | 🏖️ 海邊一日遊（2000⭐）/ 🚲 新腳踏車（5000⭐）/ 🎮 遊戲主機（3000⭐） |
| **本質** | 獎勵 — 是「學生想得到的東西」，不是「學生該做的行為」 |
| **與成就事件的關係** | 無直接關聯。學生透過各種行為（成就事件 + 考試分數）累積點數，存夠了就能達成大型目標 |
| **如何使用** | 家長在學生獎勵頁面從模板庫選取，指派給學生。學生看到進度條追蹤「還差多少」 |
| **誰管理** | 家長在獎勵中心建立模板；在學生獎勵頁面指派 |
| **資料表** | `goal_templates`（新增，全域模板）+ `reward_goals`（新增，學生層級） |
| **管理位置** | `/settings/rewards` Tab ③（模板管理）；`/student/[id]/rewards`（指派+追蹤） |

### Layer 4：獎勵規則（Reward Rules）—「自動計算引擎」

| 項目 | 說明 |
|------|------|
| **是什麼** | 定義「考幾分 → 自動獲得多少點數」的計算規則 |
| **作用域** | 全域 / 特定學生 / 特定科目 / 學生+科目（四層優先級） |
| **誰管理** | 家長在獎勵中心或科目設定頁面管理 |
| **資料表** | `reward_rules` |
| **管理位置** | `/student/[id]/subjects/[subjectId]/rewards`（科目層級）。評量分數→獎勵規則已在科目設定中完善管理，不需在全域獎勵中心重複設定 |

### Layer 5：交易記錄（Transactions）—「帳本」

| 項目 | 說明 |
|------|------|
| **是什麼** | 每一筆獎勵收支的明細記錄 |
| **類型** | `earn`（獲得）/ `use`（使用）/ `exchange`（兌換）/ `penalty`（懲罰）/ `reset`（重置） |
| **誰操作** | 系統自動（評量分數）+ 家長手動（行為獎勵）+ 學生（兌換） |
| **資料表** | `transactions` |
| **檢視頁面** | `/student/[id]/transactions`（獎金存摺） |

### Layer 6：小型兌換（Exchange Rules）—「日常獎品」

| 項目 | 說明 |
|------|------|
| **是什麼** | 定義「小額點數可以立即兌換什麼」，提供日常滿足感 |
| **舉例** | 🧱 樂高積木（200⭐）/ 🍕 披薩派對（300⭐）/ 🎫 免作業券（50⭐） |
| **與大型目標的區別** | 小型兌換 = 低門檻即時滿足；大型目標 = 高門檻長期激勵 |
| **誰管理** | 家長管理規則；學生執行兌換 |
| **資料表** | `exchange_rules` + `exchange_rule_translations` |
| **管理位置** | `/settings/rewards` Tab ④（全域）、`/student/[id]/rewards`（學生檢視+兌換） |

---

## 四、頁面架構（以「獎勵中心」為全域統合入口）

### 設計原則：由上而下

全域設定集中在一個入口，依照設定順序引導家長完成：

```
獎勵中心設定順序（線性依賴）：
① 獎勵類型 → ② 成就事件 → ③ 大型目標 → ④ 小型兌換
（先定義貨幣，才能建立事件；有了事件和類型，才能定義大獎和兌換）
```

### 全域管理層

```
/settings                          ← 一般設定（保持不變）
  ├── 站名設定、分頁設定、資源模式
  ├── 備份管理、初始化工具、語言切換
  └── ...

/settings/rewards                  ← 🆕 獎勵中心（統合入口）
  ├── [Tab ①] 獎勵類型     ← 原 /reward-types 的內容
  ├── [Tab ②] 成就事件     ← 原 /achievement-events 的內容
  ├── [Tab ③] 大型目標     ← 🆕 大型獎勵模板 CRUD（海邊玩、腳踏車…）
  └── [Tab ④] 小型兌換     ← 原僅在學生頁面，拉到全域管理
```

### 學生層級

```
/student/[id]              — 學習記錄主頁
  顯示評量卡片 + 總平均分數 + 科目/評量統計

/student/[id]/subjects     — 科目管理
  新增/編輯科目 + 科目專屬獎勵規則設定

/student/[id]/transactions — 獎金存摺 💰
  所有交易明細 + 收支總結 + 分類篩選 + 快速添加獎勵（使用成就事件標籤）

/student/[id]/rewards      — 獎勵目標 🎯（待重構）
  規劃：大型目標進度 + 獎勵餘額總覽 + 小型兌換商店（三區塊）

/student/[id]/print       — 列印報表 🖨️
  學習記錄報表 + 獎金存摺報表
```

---

## 五、核心設計決策

### 決策 1：大型目標的本質是「獎勵」，不是「行為」

| 原則 | 說明 |
|------|------|
| **大型目標 = 終極大獎** | 是學生「想得到的東西」（🏖️海邊玩、🚲腳踏車），不是「該做的行為」（考試滿分） |
| **成就事件 = 行為標籤** | 是學生「做了什麼」（作業優良、幫助同學），每次發生時獲得點數 |
| **兩者獨立、互補** | 學生透過各種行為累積點數 → 存夠點數 → 達成大型目標。大型目標不需要綁定特定事件 |
| **目標由家長指派，學生追蹤進度** | 家長從模板庫選取大獎指派給學生；學生看到進度條追蹤「還差多少」 |
| **達成後自動消耗點數** | 目標達成時，自動扣除對應點數（如同兌換），目標移入已完成列表 |

### 決策 2：獎勵的兩個獲得路徑

```
路徑 A：學業成績 → 自動獎勵
  考試/作業/評量 → reward_rules 計算 → 自動建立 earn 交易
  適用場景：有明確分數的學業表現
  
路徑 B：行為表現 → 手動獎勵
  優良行為 → 從成就事件選取標籤 → 手動建立 earn 交易
  適用場景：無法量化的行為（幫助同學、準時交作業、課堂表現）
```

### 決策 3：頁面職責重新劃分

| 頁面 | 現狀 | 規劃後定位 |
|------|------|-----------|
| `/settings/rewards` | 不存在 | **🆕 全域獎勵中心**：四個 Tab（類型/事件/大型目標/小型兌換） |
| `/student/[id]/rewards` | 獎勵類型管理 + 兌換規則（角色混亂） | **獎勵目標中樞**：大型目標進度 + 餘額總覽 + 小型兌換商店 |
| `/student/[id]/transactions` | 交易明細 + 收支統計 | **保持不變**：獎金存摺，所有收支明細，快速添加獎勵時使用成就事件標籤 |
| `/achievement-events` | 成就事件 CRUD | **合併至** `/settings/rewards` Tab ②，舊路由保留 redirect |
| `/reward-types` | 獎勵類型 CRUD | **合併至** `/settings/rewards` Tab ①，舊路由保留 redirect |
| `/settings` | 一般設定 | **保持不變**：新增「獎勵中心」入口卡片 |

### 決策 4：為什麼大型目標是必要的？

| 現狀問題 | 大型目標解決方案 |
|---------|----------------|
| 學生只看到「我有 320⭐」，不知道存這些點數可以幹嘛 | 看到「🏖️海邊玩需要2000⭐」，產生長期存點數的動力 |
| 只有小型兌換（50⭐樂高），缺乏長期激勵 | 大型目標需要幾千點，讓學生有「遠大目標」持續努力 |
| 點數多了沒事做，失去累積動力 | 可以同時追蹤多個大型目標，讓每個點數都有意義 |

### 決策 5：全域設定統合為「獎勵中心」

| 原則 | 說明 |
|------|------|
| **單一入口** | 所有獎勵相關的全域設定集中在 `/settings/rewards` |
| **線性依賴** | Tab 順序：類型 → 事件 → 大型目標 → 小型兌換 |
| **Tab 而非 Accordion** | 每個 Tab 內容獨立，Tab 隔離編輯狀態，提供清晰的流程引導 |

---

## 六、資料模型設計

### 現有資料表（不變）

```
custom_reward_types          — 獎勵類型定義
reward_rules                 — 分數→獎勵計算規則
achievement_events           — 成就事件（小型行為標籤）
achievement_event_reward_rules — 事件→獎勵關聯
exchange_rules               — 兌換規則
exchange_rule_translations   — 兌換規則翻譯
transactions                 — 交易記錄
```

### 新增資料表

```sql
-- 目標模板表（全域設定，可重複指派給不同學生）
CREATE TABLE goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本資訊
  name_zh TEXT NOT NULL,
  name_en TEXT,
  description_zh TEXT,
  description_en TEXT,
  
  -- 追蹤模式
  tracking_mode TEXT NOT NULL CHECK (tracking_mode IN ('cumulative_amount', 'completion_count')),
  target_amount NUMERIC,       -- 累積金額型：目標金額
  target_count INTEGER,        -- 完成次數型：目標次數
  
  -- 獎勵設定
  reward_type_id UUID NOT NULL REFERENCES custom_reward_types(id),
  reward_on_complete NUMERIC NOT NULL DEFAULT 0,
  
  -- 外觀
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6a99e0',
  
  -- 狀態
  is_active BOOLEAN DEFAULT true,
  
  -- 排序與時間
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 目標模板 ↔ 成就事件關聯（定義哪些行為會推進目標進度）
CREATE TABLE goal_template_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES goal_templates(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES achievement_events(id) ON DELETE CASCADE,
  UNIQUE(template_id, event_id)
);

-- 學生獎勵目標表（從模板指派給特定學生）
CREATE TABLE reward_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id UUID REFERENCES goal_templates(id) ON DELETE SET NULL,
  
  -- 基本資訊（從模板複製，允許微調）
  name_zh TEXT NOT NULL,
  name_en TEXT,
  description_zh TEXT,
  description_en TEXT,
  
  -- 追蹤模式
  tracking_mode TEXT NOT NULL CHECK (tracking_mode IN ('cumulative_amount', 'completion_count')),
  target_amount NUMERIC,
  target_count INTEGER,
  
  -- 獎勵設定
  reward_type_id UUID NOT NULL REFERENCES custom_reward_types(id),
  reward_on_complete NUMERIC NOT NULL DEFAULT 0,
  
  -- 外觀
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6a99e0',
  
  -- 期限
  deadline DATE,              -- NULL = 無限期
  
  -- 狀態
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  completed_at TIMESTAMPTZ,
  
  -- 排序與時間
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 目標進度記錄表
CREATE TABLE reward_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES reward_goals(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  progress_amount NUMERIC,
  progress_count INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 關聯圖

```
goal_templates (全域)
  ├── custom_reward_types (N:1)
  └── goal_template_event_links (1:N)
        └── achievement_events (N:1)

reward_goals (學生層級)
  ├── students (N:1)
  ├── goal_templates (N:1, nullable)
  ├── custom_reward_types (N:1)
  └── reward_goal_progress (1:N)
        └── transactions (N:1, nullable)

transactions
  ├── students (N:1)
  ├── custom_reward_types (N:1, nullable)
  ├── achievement_events (N:1, nullable)
  └── reward_goal_progress (1:N, 反向關聯)
```

---

## 七、API 設計（新增 + 現有調整）

### 新增 API — 目標模板（全域設定）

| 方法 | 路徑 | 用途 |
|------|------|------|
| `GET` | `/api/goal-templates/list` | 取得所有目標模板（含關聯的成就事件） |
| `POST` | `/api/goal-templates/create` | 建立新目標模板（含事件關聯） |
| `POST` | `/api/goal-templates/update` | 更新目標模板 |
| `POST` | `/api/goal-templates/delete` | 刪除目標模板 |
| `POST` | `/api/goal-templates/reorder` | 排序目標模板 |

### 新增 API — 學生目標

| 方法 | 路徑 | 用途 |
|------|------|------|
| `GET` | `/api/students/[id]/reward-goals` | 取得學生所有目標（含進度摘要與近期活動） |
| `POST` | `/api/reward-goals/create` | 建立新目標（可從模板指派或自訂） |
| `POST` | `/api/reward-goals/update` | 更新目標（名稱、期限、金額等） |
| `POST` | `/api/reward-goals/delete` | 刪除目標（含關聯進度記錄） |
| `POST` | `/api/reward-goals/record-progress` | 記錄目標進度（建立 progress + earn transaction） |
| `POST` | `/api/reward-goals/complete` | 標記目標完成（發放 reward_on_complete） |
| `POST` | `/api/reward-goals/reorder` | 排序目標 |

### 現有 API（需調整）

| API | 調整內容 |
|-----|---------|
| `POST /api/rewards/add` | 新增 `goal_id` 可選參數，記錄進度時自動關聯目標 |
| `GET /api/students/[id]/reward-stats` | 現有邏輯已足夠，無需修改 |

---

## 八、使用者故事（User Stories）

### 故事 1：家長為學生設定大型目標

> 小明的媽媽希望他在期末考前能累積 500⭐。她在獎勵目標頁面點擊「新增目標」，選擇「考試滿分」模板，設定目標金額 500⭐、達成獎勵 +200⭐、期限為期末考日期。小明每次考完試獲得獎勵時，進度條就會自動更新，媽媽可以隨時查看進度。

### 故事 2：學生查看自己的目標進度

> 小明打開獎勵目標頁面，看到「期末考數學滿分」的進度條已經 64%，還差 180⭐ 就能達成。他也看到「可兌換獎勵」中有樂高積木組需要 200⭐，目前有 320⭐ 可以立即兌換。

### 故事 3：家長快速記錄日常行為獎勵

> 小明今天在課堂上主動幫助同學解數學題。媽媽打開獎金存摺頁面，點擊「快速添加獎勵」，從事件模板中選擇「🤝 幫助同學」，系統自動帶入 +5❤️。整個操作在 5 秒內完成。

### 故事 4：學生用累積的獎勵兌換獎品

> 小明累積了 320⭐，他很想要樂高積木組（需要 200⭐）。他在可兌換獎勵區看到樂高積木組顯示「✅ 可以兌換」，點擊「立即兌換」後確認，系統自動扣除 200⭐，餘額變為 120⭐。

---

## 九、激勵效果設計

### 為什麼這個設計能激勵學生？

| 心理機制 | 設計對應 |
|---------|---------|
| **目標設定理論** (Goal-Setting Theory) | 明確的目標名稱 + 具體數字 + 期限 = 提高達成率 |
| **進度可視化** (Progress Visualization) | 進度條 + 百分比，讓學生看到「我快達成了」 |
| **即時回饋** (Immediate Feedback) | 每次獲得獎勵後進度條立即更新 |
| **自我決定論** (Self-Determination Theory) | 兌換商店讓學生「自主選擇」想要的獎品 |
| **累積效應** (Endowment Effect) | 看到餘額增加，不願失去已累積的獎勵 |
| **慶祝儀式** (Celebration) | 目標達成時有明確的完成動畫/通知 |

### Gamification 元素

| 元素 | 設計 |
|------|------|
| **進度條** | 視覺化目標完成百分比 |
| **獎勵貨幣** | 多種貨幣類型（⭐💎❤️），增加收集樂趣 |
| **商店系統** | 學生可用貨幣「購買」獎品 |
| **里程碑** | 目標達成 = 解鎖成就 |
| **願望清單** | 餘額不足時加入願望清單，保持期待感 |

---

## 十、實施路徑（Roadmap）

### Phase 0：全域設定統一（架構基礎）

| 任務 | 說明 | 優先級 |
|------|------|--------|
| 建立 `/settings/rewards` 獎勵中心頁面 | 四個 Tab 的框架（類型/事件/大型目標/兌換） | P0 |
| 遷移 `/reward-types` → Tab ① | 將現有 CustomRewardTypesManager 嵌入 Tab | P0 |
| 遷移 `/achievement-events` → Tab ② | 將現有 AchievementEventsManager 嵌入 Tab | P0 |
| 舊路由 redirect | `/reward-types`、`/achievement-events` → `/settings/rewards` | P0 |

### Phase 1：奠定基礎（現有功能優化）

| 任務 | 說明 | 優先級 |
|------|------|--------|
| 重構 `/student/[id]/rewards` 頁面 | 從「類型管理+兌換」改為「目標+餘額+兌換」三區塊 | P0 |
| 統一導覽命名 | 確保所有側欄/下拉選單中的名稱一致 | P0 |
| 強化快速添加獎勵 | 讓存摺頁面的快速添加更直覺（整合 Achievement Events） | P1 |

### Phase 2：目標模板系統（全域設定）

| 任務 | 說明 | 優先級 |
|------|------|--------|
| 建立 `goal_templates` + `goal_template_event_links` 資料表 | 執行 SQL migration | P0 |
| 建立目標模板 CRUD API | list / create / update / delete / reorder | P0 |
| 實作 Tab ③ 大型目標 UI | 模板列表 + 新增/編輯彈窗 + 事件關聯設定 | P0 |

### Phase 3：學生目標系統（核心新功能）

| 任務 | 說明 | 優先級 |
|------|------|--------|
| 建立 `reward_goals` + `reward_goal_progress` 資料表 | 執行 SQL migration | P0 |
| 建立學生目標 CRUD API | create（含從模板指派）/ update / delete / list / reorder | P0 |
| 建立目標進度 API | record-progress / complete | P0 |
| 實作目標卡片 UI | 三種追蹤模式的進度條 + 操作按鈕 | P0 |
| 實作新增/編輯目標彈窗 | 含模板選取 + 表單驗證 | P0 |

### Phase 4：體驗優化（錦上添花）

| 任務 | 說明 | 優先級 |
|------|------|--------|
| 目標達成動畫/慶祝效果 | 目標完成時的特殊視覺效果 | P2 |
| 願望清單功能 | 餘額不足的兌換品可存入願望清單 | P2 |
| 目標歷史歸檔 | 已完成的目標可檢視回顧 | P2 |
| 手機版適配 | 確保所有頁面在手機上易於操作 | P1 |
| Tab ④ 兌換規則全域管理 | 將兌換規則拉到全域獎勵中心，支援學生層級複寫 | P2 |

---

## 十一、風險與權衡

| 風險 | 緩解方案 |
|------|---------|
| 目標系統增加複雜度，家長學習成本高 | 提供預設模板（從 Achievement Events 選取），降低建立門檻 |
| 學生可能過度關注獎勵而非學習本身 | 目標設計應與學業表現掛鉤（如考試滿分），確保獎勵是學習的副產品 |
| 目標過多造成管理負擔 | 限制每位學生同時進行中的目標數量（建議 ≤ 5 個） |
| 兌換規則若太寬鬆，獎勵貶值 | 由家長自行控制兌換比例，系統不做限制 |

---

## 十二、與現有功能的重疊檢查

| 現有功能 | 是否衝突 | 處理方式 |
|---------|---------|---------|
| 獎金存摺 (`/transactions`) | 不衝突，互補 | 存摺 = 明細清單；目標頁 = 進度總覽。兩者共用相同交易數據 |
| 成就事件 (`/achievement-events`) | 定位調整 | 拆分為兩個概念：① 成就事件（小型行為標籤，Tab ②）；② 大型目標模板（大型目標藍圖，Tab ③）。舊路由 redirect 至 `/settings/rewards` |
| 獎勵類型 (`/reward-types`) | 合併 | 移至 `/settings/rewards` Tab ①，舊路由 redirect |
| 獎勵規則 (`reward_rules`) | 不納入全域中心 | 評量分數→獎勵規則在科目層級（`/subjects/[subjectId]/rewards`）已完善，不需在全域獎勵中心重複管理 |
| 兌換規則 (`exchange_rules`) | 雙層管理 | 全域預設在 Tab ④；學生可在獎勵目標頁面覆寫或新增個人兌換規則 |

---

## 十三、驗收標準

### 全域獎勵中心驗收

- [ ] `/settings/rewards` 可正常訪問，四個 Tab 切換流暢
- [ ] Tab ① 獎勵類型：CRUD 正常（等同原 `/reward-types`）
- [ ] Tab ② 成就事件：CRUD 正常（等同原 `/achievement-events`）
- [ ] Tab ③ 大型目標：可建立模板、綁定成就事件
- [ ] Tab ④ 小型兌換：全域兌換規則 CRUD 正常
- [ ] 舊路由 `/reward-types`、`/achievement-events` 正確 redirect

### 學生獎勵目標驗收

- [ ] 家長可以在目標頁面建立新目標（從模板指派或自訂，兩種追蹤模式）
- [ ] 學生可以看到目標進度條即時更新（獲得獎勵後）
- [ ] 家長可以記錄目標進度（手動添加）
- [ ] 目標達成時自動發放獎勵，目標移入已完成列表
- [ ] 學生可以在兌換商店看到可兌換獎品，並執行兌換
- [ ] 快速添加獎勵支援選擇 Achievement Event 標籤

### 激勵效果驗收

- [ ] 學生能回答「我目前的目標是什麼」
- [ ] 學生能回答「我還差多少可以達成目標」
- [ ] 學生能回答「達成目標後我可以得到什麼」
- [ ] 學生能回答「我可以用獎勵兌換什麼」

---

## 十四、參考文件

| 文件 | 說明 |
|------|------|
| `docs/latest_plan.md` | 最新規劃（P0/P1/P2 優先級） |
| `docs/REWARD_GOALS_PAGE_WIREFRAME.md` | 獎勵目標頁面 UI Wireframe |
| `docs/REWARD_RULES_GUIDE.md` | 獎勵規則設定指南 |
| `docs/PASSBOOK_GUIDE.md` | 獎金存摺使用指南 |
| `docs/ACHIEVEMENT_EVENTS_OPERATION_AND_DEPLOY_CHECKLIST.md` | 成就事件操作與部署檢查 |
| `app/demo/reward-goals/page.tsx` | Demo 頁面（可互動預覽） |

---

> **下一步**：請審查此設計規劃，確認方向與專案需求對齊後，即可開始 Phase 1 實作。
