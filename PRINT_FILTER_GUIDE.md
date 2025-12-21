# 列印報表篩選功能

## 🎯 功能說明

列印報表現在支持**科目**和**月份**雙重篩選，打印內容會根據當前選擇的篩選條件自動調整。

---

## 📊 功能特點

### **1. 動態篩選**
- ✅ 月份篩選：只顯示特定月份的評量記錄
- ✅ 科目篩選：只顯示特定科目的評量記錄
- ✅ 組合篩選：可以同時篩選月份和科目

---

### **2. 自動標題更新**
報表標題會顯示當前篩選條件：
```
未篩選：
小明 學習記錄
全部記錄

月份篩選：
小明 學習記錄
2025年12月 報表

科目篩選：
小明 學習記錄
📖 國語 - 全部記錄

組合篩選：
小明 學習記錄
📖 國語 - 2025年12月 報表
```

---

### **3. 準確統計**
統計數據會根據篩選條件自動計算：
- 總評量數
- 已完成數
- 平均分數
- 總獎金

---

## 🎨 使用流程

### **場景 1：列印特定月份的報表**

```
步驟：
1. 在學生頁面選擇月份（如：2025年12月）
2. 點擊「🖨️ 列印報表」按鈕
3. 自動生成該月份的報表

結果：
- 標題顯示：2025年12月 報表
- 只包含12月的評量記錄
- 統計數據僅計算12月的資料
```

---

### **場景 2：列印特定科目的報表**

```
步驟：
1. 在學生頁面選擇科目（如：📖 國語）
2. 點擊「🖨️ 列印報表」按鈕
3. 自動生成該科目的報表

結果：
- 標題顯示：📖 國語 - 全部記錄
- 只包含國語科目的評量記錄
- 統計數據僅計算國語科目的資料
```

---

### **場景 3：列印特定科目的特定月份報表**

```
步驟：
1. 在學生頁面選擇月份（如：2025年12月）
2. 選擇科目（如：📖 國語）
3. 點擊「🖨️ 列印報表」按鈕
4. 自動生成該科目該月份的報表

結果：
- 標題顯示：📖 國語 - 2025年12月 報表
- 只包含國語科目在12月的評量記錄
- 統計數據僅計算國語科目在12月的資料
```

---

### **場景 4：列印全部記錄**

```
步驟：
1. 在學生頁面選擇「全部月份」
2. 選擇「📚 全部」科目
3. 點擊「🖨️ 列印報表」按鈕
4. 自動生成完整報表

結果：
- 標題顯示：全部記錄
- 包含所有科目所有月份的評量記錄
- 統計數據計算所有資料
```

---

## 🔧 技術實現

### **1. URL 參數傳遞**

```typescript
// StudentRecords.tsx
<Link
  href={`/student/${studentId}/print?${new URLSearchParams({
    ...(selectedMonth && { month: selectedMonth }),
    ...(selectedSubject && { subject: selectedSubject })
  }).toString()}`}
  target="_blank"
>
  🖨️ 列印報表
</Link>
```

**示例 URL**：
```
無篩選：/student/123/print
月份篩選：/student/123/print?month=2025-12
科目篩選：/student/123/print?subject=abc-def-ghi
組合篩選：/student/123/print?month=2025-12&subject=abc-def-ghi
```

---

### **2. 打印頁面篩選邏輯**

```typescript
// print/page.tsx
export default async function PrintPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string; subject?: string }>
}) {
  const { id } = await params
  const { month, subject } = await searchParams
  
  // 獲取所有評量
  let assessments = allAssessments
  
  // 篩選月份
  if (month) {
    assessments = assessments?.filter(a => {
      if (!a.due_date) return false
      const date = new Date(a.due_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === month
    })
  }
  
  // 篩選科目
  if (subject) {
    assessments = assessments?.filter(a => a.subject_id === subject)
  }
  
  // 計算統計
  const totalAssessments = assessments?.length || 0
  const completedAssessments = assessments?.filter(a => a.status === 'completed').length || 0
  // ...
}
```

---

### **3. 狀態管理**

```typescript
// StudentRecords.tsx
export default function StudentRecords({ ... }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  
  // 傳遞給 SubjectTabs
  <SubjectTabs 
    selectedSubject={selectedSubject}
    setSelectedSubject={setSelectedSubject}
    // ...
  />
}
```

```typescript
// SubjectTabs.tsx
export default function SubjectTabs({ 
  selectedSubject, 
  setSelectedSubject, 
  // ...
}) {
  // 使用父組件的 state
  <button onClick={() => setSelectedSubject(subject.id)}>
    {subject.icon} {subject.name}
  </button>
}
```

---

## 📋 報表內容結構

```
┌─────────────────────────────────────────────┐
│ [學生頭像] 小明 學習記錄                    │
│ 📖 國語 - 2025年12月 報表                   │
│ 列印日期：2025年12月16日                     │
├─────────────────────────────────────────────┤
│ 統計卡片                                     │
│ [總評量數] [已完成] [平均分數] [總獎金]     │
├─────────────────────────────────────────────┤
│ 📋 評量記錄明細                              │
│ [表格：日期、科目、類型、名稱、分數...]     │
├─────────────────────────────────────────────┤
│ Wilbur's RewardBook - 學習獎勵系統          │
└─────────────────────────────────────────────┘
```

---

## 🎯 示例場景對比

### **全部記錄**
```
標題：小明 學習記錄 - 全部記錄
統計：
- 總評量數：20
- 已完成：18
- 平均分數：85.5%
- 總獎金：$450

記錄：
12/16 國語 考試 期末考試 95/100 95.0% $50
12/15 數學 作業 習題練習 88/100 88.0% $20
12/14 英語 小考 單字測驗 92/100 92.0% $25
...（共20筆）
```

---

### **國語科目**
```
標題：小明 學習記錄 - 📖 國語 - 全部記錄
統計：
- 總評量數：8
- 已完成：8
- 平均分數：90.2%
- 總獎金：$200

記錄：
12/16 國語 考試 期末考試 95/100 95.0% $50
12/10 國語 作業 作文練習 88/100 88.0% $20
12/05 國語 小考 字音字形 92/100 92.0% $25
...（共8筆國語記錄）
```

---

### **12月記錄**
```
標題：小明 學習記錄 - 2025年12月 報表
統計：
- 總評量數：15
- 已完成：14
- 平均分數：87.3%
- 總獎金：$350

記錄：
12/16 國語 考試 期末考試 95/100 95.0% $50
12/15 數學 作業 習題練習 88/100 88.0% $20
12/14 英語 小考 單字測驗 92/100 92.0% $25
...（共15筆12月記錄）
```

---

### **國語 + 12月**
```
標題：小明 學習記錄 - 📖 國語 - 2025年12月 報表
統計：
- 總評量數：5
- 已完成：5
- 平均分數：91.0%
- 總獎金：$150

記錄：
12/16 國語 考試 期末考試 95/100 95.0% $50
12/10 國語 作業 作文練習 88/100 88.0% $20
12/05 國語 小考 字音字形 92/100 92.0% $25
...（共5筆國語12月記錄）
```

---

## ✅ 優勢總結

| 優勢 | 說明 |
|------|------|
| 🎯 **精準篩選** | 根據實際需求選擇要打印的內容 |
| 📊 **準確統計** | 統計數據自動匹配篩選範圍 |
| 📝 **清晰標題** | 一眼就知道報表的範圍 |
| 🖨️ **靈活打印** | 可打印全部或部分記錄 |
| ⚡ **即時生成** | 無需等待，立即生成報表 |
| 🎨 **美觀排版** | A4 格式，適合打印存檔 |

---

## 📂 修改的文件

| 文件 | 說明 |
|------|------|
| `StudentRecords.tsx` | ✅ 添加 `selectedSubject` 狀態 |
| `StudentRecords.tsx` | ✅ 更新打印鏈接傳遞參數 |
| `SubjectTabs.tsx` | ✅ 接收父組件的篩選狀態 |
| `print/page.tsx` | ✅ 接收並處理 `subject` 參數 |
| `print/page.tsx` | ✅ 實現科目篩選邏輯 |
| `print/page.tsx` | ✅ 更新標題顯示篩選信息 |
| `PRINT_FILTER_GUIDE.md` | ✅ 完整功能說明文檔 |

---

## 🎓 使用建議

### **1. 家長會報告**
```
建議：選擇特定月份
目的：展示該月的學習成果
優勢：資料集中，重點突出
```

---

### **2. 科目成績單**
```
建議：選擇特定科目
目的：分析單一科目表現
優勢：便於縱向比較進步
```

---

### **3. 學期總結**
```
建議：選擇全部記錄
目的：完整學習歷程記錄
優勢：全面了解整體表現
```

---

### **4. 專項分析**
```
建議：選擇科目 + 月份
目的：深入分析特定科目在特定時期的表現
優勢：精準定位問題或亮點
```

---

## 🎉 總結

```
學生頁面選擇篩選條件
    ↓
點擊「列印報表」按鈕
    ↓
自動傳遞篩選參數
    ↓
打印頁面根據參數篩選資料
    ↓
生成對應的報表內容
    ↓
標題顯示篩選範圍
    ↓
統計數據匹配篩選
    ↓
用戶獲得精準報表
```

🎊 **現在列印報表會根據科目與月份的篩選條件自動調整內容，讓報表更加精準實用！**

