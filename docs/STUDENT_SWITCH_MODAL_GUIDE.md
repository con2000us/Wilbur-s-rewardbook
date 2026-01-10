# 切換學生下拉選單改動說明

## 概述
創建了一個新的獨立組件 `StudentSwitchModal`，用於在學習記錄頁面提供更好的學生切換體驗，採用 `select.htm` 的設計風格，以**下拉選單形式**呈現，並與頁面其他資訊卡保持統一的視覺風格。

## 改動內容

### 1. 新建檔案
- `wilburs-rewardbook/app/student/[id]/components/StudentSwitchModal.tsx`
  - 獨立的切換學生下拉選單組件
  - 使用 `select.htm` 的版型設計
  - 實現李芯妍的hover覆蓋動畫效果
  - **直接放在按鈕下方，無外框和背景遮罩**
  - **與頁面其他資訊卡統一風格（玻璃態效果）**

### 2. 修改檔案
- `wilburs-rewardbook/app/student/[id]/SidebarContent.tsx`
  - 移除了對 `StudentHeaderWithDropdown` 的引用
  - 改用新的 `StudentSwitchModal` 組件
  - 將按鈕和下拉選單包裹在同一個容器中

## 設計特色

### 1. 下拉選單形式
- **直接顯示在按鈕下方**，不是獨立的 popup
- **無外框背景遮罩**
- 透明玻璃態效果
- **向下展開/收起動畫**（雙向動畫）

### 2. 統一的視覺風格
學生卡片使用與頁面其他資訊卡一致的玻璃態樣式：
- **背景透明度**：`rgba(255, 255, 255, 0.2)`
- **背景模糊**：`backdrop-filter: blur(12px)`
- **邊框**：`1px solid rgba(255, 255, 255, 0.3)`
- **頂部漸變線**：`linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`

### 3. 李芯妍風格的 Hover 覆蓋動畫
每個學生項目都有以下效果：
- 默認顯示：學生頭像、名稱、「學習記錄」文字
- **覆蓋層默認隱藏**在右側（`translate-x-full opacity-0`）
- **Hover 時覆蓋層從右側滑入**（`translate-x-0 opacity-100`）
- **只顯示三個操作按鈕**：獎金存摺、科目管理、學生設定
- **動態文字切換**：
  - 默認：「學習記錄」
  - Hover 獎金存摺圖標：「獎金存摺」
  - Hover 科目管理圖標：「科目管理」
  - Hover 學生設定圖標：「設定」
- **點擊操作按鈕**：跳轉到對應學生的頁面
- **注意**：學生卡片不使用傳統的 hover 效果（位移、陰影等），以避免與覆蓋動畫衝突

### 4. 流暢的動畫效果
#### 向下展開動畫（開啟）
```css
transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out'
```
- 從 `max-height: 0, opacity: 0` 到 `max-height: 600px, opacity: 100`
- 平滑的向下展開效果

#### 向上收起動畫（關閉）
```css
transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out'
```
- 從 `max-height: 600px, opacity: 100` 到 `max-height: 0, opacity: 0`
- 平滑的向上收起效果

### 5. 視覺設計
- 圓角卡片（rounded-2xl）
- 玻璃態效果（背景模糊、半透明）
- 深色模式支援
- 流暢的過渡動畫
- 自動滾動（內容過多時）

### 6. 交互體驗
- ✅ 點擊按鈕切換下拉選單顯示/隱藏
- ✅ 點擊外部區域關閉
- ✅ 按 ESC 鍵關閉
- ✅ **流暢的開啟/關閉動畫（雙向）**

## 功能特性

### 學生切換功能
- ✅ 點擊學生項目直接切換到該學生的學習記錄
- ✅ Hover 時顯示三個操作按鈕（從右側滑入）：
  - 💰 獎金存摺（跳轉到該學生的獎金存摺頁）
  - 📚 科目管理（跳轉到該學生的科目管理頁）
  - ⚙️ 學生設定（打開該學生的設定 Modal）
- ✅ **動態文字顯示**：
  - 默認顯示：「學習記錄」
  - Hover 獎金存摺圖標時顯示：「獎金存摺」
  - Hover 科目管理圖標時顯示：「科目管理」
  - Hover 學生設定圖標時顯示：「設定」
- ✅ **點擊圖標後跳轉到對應學生的頁面**
- ✅ 返回首頁按鈕（保留傳統 hover 效果）

### 響應式設計
- 適配桌面和移動端
- 最大高度 600px，超出可滾動

## 使用方式

### 在學習記錄頁面
用戶點擊「切換學生」按鈕後，下拉選單會直接顯示在按鈕下方：
1. 點擊按鈕打開/關閉下拉選單（**都有動畫**）
2. 點擊學生項目可直接切換到該學生的學習記錄
3. Hover 學生項目時顯示四個操作按鈕，可直接切換到特定頁面
4. 點擊外部區域或按 ESC 鍵關閉下拉選單

### 在其他頁面
其他頁面（獎金存摺、科目管理等）不受影響，繼續使用原有的 `StudentHeaderWithDropdown` 組件。

## 技術實現

### StudentSwitchModal 組件
```typescript
interface Props {
  isOpen: boolean
  onClose: () => void
  currentStudentId: string
  allStudents: Student[]
}
```

### 主要功能
- 獨立狀態管理
- 頭像解析（支援 emoji 和漸變背景）
- 路由跳轉
- 事件觸發（設定 Modal）
- 外部點擊檢測
- ESC 鍵處理
- 響應式佈局

### 樣式實現

#### 玻璃態基礎樣式（glass-card-base）
```css
.glass-card-base {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.glass-card-base::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
}
```

#### 開啟/關閉動畫
```css
transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out'
```
- **開啟**：`max-h-[600px] opacity-100`
- **關閉**：`max-h-0 opacity-0 pointer-events-none`

#### Hover 覆蓋動畫
```css
.list-item-actions {
  translate-x-full;
  opacity-0;
  transition-all duration-300;
}

.group-hover .list-item-actions {
  translate-x-0;
  opacity-100;
}
```

**默認狀態**：覆蓋層隱藏在右側
**Hover 狀態**：覆蓋層從右側滑入

#### 動態文字切換
使用 `hoveredActions` state 追蹤每個學生的 hover 狀態：

```typescript
const [hoveredActions, setHoveredActions] = useState<Record<string, HoverAction>>({})

const getActionText = (action: HoverAction) => {
  switch (action) {
    case 'records':
      return tStudent('recordsTitle')  // 學習記錄
    case 'transactions':
      return tTransaction('passbook')  // 獎金存摺
    case 'subjects':
      return tHome('features.subjects.title')  // 科目管理
    case 'settings':
      return tNav('settings')  // 設定
    default:
      return tStudent('recordsTitle')
  }
}
```

**默認值**：`'records'`（學習記錄）
**觸發時機**：
- `onMouseEnter` 圖標時：設定為對應的 action
- `onMouseLeave` 圖標時：重置為 `'records'`

### 佈局結構
```
SidebarContent
└── div (relative container, id="student-switch-button-container")
    ├── Button (切換學生按鈕)
    └── StudentSwitchModal (下拉選單)
        └── div (relative)
            └── 展開/收起容器
                ├── 其他帳號標題
                ├── 學生列表（每個都有 hover 覆蓋動畫）
                └── 返回首頁按鈕（保留傳統 hover）
```

## 測試建議

### 1. 基本功能
- [ ] 點擊「切換學生」按鈕，確認下拉選單正確顯示在按鈕下方
- [ ] 確認開啟動畫流暢（向下展開）
- [ ] 再次點擊按鈕，確認下拉選單正確關閉
- [ ] 確認關閉動畫流暢（向上收起）
- [ ] 點擊背景，確認下拉選單正確關閉（有動畫）
- [ ] 按 ESC 鍵，確認下拉選單正確關閉（有動畫）

### 2. 樣式統一性
- [ ] 確認學生卡片與頁面其他資訊卡有相同的玻璃態效果
- [ ] 確認透明度一致
- [ ] 確認邊框一致
- [ ] 確認頂部漸變線一致

### 3. 切換功能
- [ ] 點擊學生項目，確認正確切換到該學生的學習記錄
- [ ] 點擊覆蓋層的獎金存摺圖標，確認跳轉到該學生的獎金存摺頁
- [ ] 點擊覆蓋層的科目管理圖標，確認跳轉到該學生的科目管理頁
- [ ] 點擊覆蓋層的學生設定圖標，確認打開該學生的設定 Modal
- [ ] 點擊返回首頁，確認正確跳轉

### 4. 動畫效果
- [ ] 開啟下拉選單，確認向下展開動畫正確
- [ ] 關閉下拉選單，確認向上收起動畫正確
- [ ] 確認展開/收起動畫是雙向的
- [ ] Hover 學生項目，確認覆蓋層從右側滑入動畫正確
- [ ] Hover 結束後，確認覆蓋層滑回右側並隱藏
- [ ] 確認覆蓋層默認是隱藏的（translate-x-full opacity-0）
- [ ] 確認所有過渡動畫流暢

### 5. 動態文字切換
- [ ] 默認狀態確認顯示「學習記錄」
- [ ] Hover 獎金存摺圖標，確認文字變為「獎金存摺」
- [ ] Hover 科目管理圖標，確認文字變為「科目管理」
- [ ] Hover 學生設定圖標，確認文字變為「設定」
- [ ] 離開圖標後，確認文字恢復為「學習記錄」

### 5. 學生卡片 Hover 效果
- [ ] 確認學生卡片不會上下移動（無 translate）
- [ ] 確認學生卡片不會改變陰影
- [ ] 確認覆蓋動畫正常工作

### 6. 返回首頁按鈕 Hover 效果
- [ ] Hover 返回首頁按鈕，確認有位移效果
- [ ] 確認背景變亮
- [ ] 確認邊框變亮
- [ ] 確認陰影增強

### 7. 滾動功能
- [ ] 當學生數量較多時，確認可以正確滾動
- [ ] 確認滾動條已隱藏（no-scrollbar）

### 8. 深色模式
- [ ] 切換到深色模式
- [ ] 確認下拉選單樣式正確
- [ ] 確認 hover 效果正常
- [ ] 確認玻璃態效果在深色模式下正確

### 9. 響應式
- [ ] 在不同螢幕尺寸下測試
- [ ] 確認下拉選單寬度適當

### 10. 其他頁面
- [ ] 確認獎金存摺頁面不受影響
- [ ] 確認科目管理頁面不受影響
- [ ] 確認其他使用 `StudentHeaderWithDropdown` 的頁面正常

## 與原版 StudentHeaderWithDropdown 的差異

| 特性 | StudentSwitchModal (新) | StudentHeaderWithDropdown (舊) |
|------|----------------------|-----------------------------|
| 顯示形式 | 下拉選單（按鈕下方） | 下拉選單（按鈕下方） |
| 有無背景遮罩 | ❌ 無 | ❌ 無 |
| 有無外框 | ❌ 無額外外框 | ❌ 無額外外框 |
| 開啟/關閉動畫 | ✅ 雙向動畫 | ✅ 雙向動畫 |
| 設計風格 | 李芯妍風格（hover覆蓋動畫） | 傳統列表風格 |
| 卡片樣式 | 玻璃態（與頁面統一） | 玻璃態（與頁面統一） |
| Hover 效果 | 學生卡片無，返回首頁有 | 有 |
| 使用頁面 | 僅學習記錄頁面 | 其他所有頁面 |

## 注意事項

1. **此改動只影響學習記錄頁面**的「切換學生」功能
2. **其他頁面不受影響**，繼續使用原有的 `StudentHeaderWithDropdown` 組件
3. 確保 `allStudents` 參數正確傳遞到 `StudentSwitchModal`
4. 新組件支援深色模式，確保樣式一致
5. 下拉選單使用 `relative` 定位，確保按鈕和選單在同一個容器中
6. 使用自定義 `glass-card-base` 類別，與頁面其他資訊卡保持統一風格
7. **學生卡片不使用傳統 hover 效果**（位移、陰影等），以避免與覆蓋動畫衝突
8. **返回首頁按鈕保留傳統 hover 效果**，提供更好的視覺回饋
9. 開啟和關閉都有流暢的動畫效果

## 更新日誌

### v5.1 (2025-01-09)
- **修正返回首頁文字**：默認顯示「返回首頁」而非網站名稱
- **修正 overlay 背景**：與學生選單一致（使用 pink-50/90 而非 indigo）

### v5.0 (2025-01-09)
- **增加不透明度**，讓 overlay 設定 icon 不會從背景透出
- **實現動態文字切換**（返回首頁）
- hover 設定 icon 時文字改為「網站設定」
- hover 離開設定 icon 時文字恢復為返回首頁

### v4.0 (2025-01-09)
- **覆蓋層改為 hover 時才滑入**，默認隱藏在右側
- **只保留三個操作圖標**：獎金存摺、科目管理、學生設定（移除學習記錄圖標）
- **默認文字改為「學習記錄」**
- **實現動態文字切換**：hover 不同圖標時顯示對應文字
- **優化交互體驗**：點擊圖標後跳轉到對應學生的頁面

### v3.0 (2025-01-09)
- **統一學生卡片樣式**，與頁面其他資訊卡保持一致的玻璃態效果
- **實現雙向動畫**，開啟和關閉都有流暢的過渡效果
- 學生卡片不使用傳統 hover 效果（避免與覆蓋動畫衝突）
- 返回首頁按鈕保留傳統 hover 效果

### v2.0 (2025-01-09)
- 將從 popup 形式改為下拉選單形式
- 移除背景遮罩
- 移除外框
- 直接顯示在按鈕下方
- 優化動畫效果（slideDown/slideUp）

### v1.0 (初始版本)
- 創建獨立的切換學生組件
- 實現李芯妍風格的 hover 覆蓋動畫
- 採用 `select.htm` 的版型設計
