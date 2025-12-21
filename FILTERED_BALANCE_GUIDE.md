# 累積獎金動態篩選功能

## 🎯 功能說明

學生頁面的**累積獎金顯示**（餘額、總收入、總支出）現在會根據當前選擇的**月份**和**科目**篩選條件動態計算。

---

## ✨ 核心特點

### **動態計算累積獎金**
- ✅ 根據月份篩選：只顯示該月份的收支統計
- ✅ 根據科目篩選：只顯示該科目的收支統計
- ✅ 組合篩選：可同時按月份和科目篩選
- ✅ 考慮歸零記錄：正確處理歸零點的起始金額

---

## 📊 顯示效果對比

### **全部記錄**
```
┌─────────────────────────┐
│     累積獎金            │
│       $450              │
├─────────────────────────┤
│ 收入 +$500              │
│ 支出 -$50               │
└─────────────────────────┘
```

---

### **篩選月份：2025年12月**
```
┌─────────────────────────┐
│  累積獎金（12月）       │
│       $350              │
├─────────────────────────┤
│ 收入 +$380              │
│ 支出 -$30               │
└─────────────────────────┘
```

---

### **篩選科目：📖 國語**
```
┌─────────────────────────┐
│ 累積獎金（國語科）      │
│       $200              │
├─────────────────────────┤
│ 收入 +$200              │
│ 支出 -$0                │
└─────────────────────────┘
```

---

### **組合篩選：📖 國語 + 12月**
```
┌─────────────────────────┐
│累積獎金（國語-12月）    │
│       $150              │
├─────────────────────────┤
│ 收入 +$150              │
│ 支出 -$0                │
└─────────────────────────┘
```

---

## 🎨 使用場景

### **場景 1：查看本月收支**
```
操作：
1. 選擇「2025年12月」
2. 保持「📚 全部」科目

結果：
- 累積獎金：顯示12月的總收支
- 只計入12月份的交易記錄
- 可以看到本月的獎金變化
```

---

### **場景 2：查看國語科目總收入**
```
操作：
1. 選擇「全部月份」
2. 點擊「📖 國語」科目

結果：
- 累積獎金：顯示國語科目的總收支
- 只計入與國語評量相關的獎金
- 可以了解這個科目帶來的總獎金
```

---

### **場景 3：查看國語本月收入**
```
操作：
1. 選擇「2025年12月」
2. 點擊「📖 國語」科目

結果：
- 累積獎金：顯示國語科目在12月的收支
- 只計入國語評量在12月的獎金
- 精確分析單科目單月表現
```

---

## 🔧 技術實現

### **1. 資料獲取**

```typescript
// page.tsx
// 獲取交易記錄
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('student_id', id)
  .order('transaction_date', { ascending: false })

// 傳遞給 StudentRecords
<StudentRecords 
  transactions={transactions || []}
  // ...
/>
```

---

### **2. 篩選邏輯**

```typescript
// StudentRecords.tsx
useEffect(() => {
  let filteredTransactions = transactions

  // 步驟1：根據月份篩選
  if (selectedMonth) {
    filteredTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === selectedMonth
    })
  }

  // 步驟2：根據科目篩選（通過 assessment_id 關聯）
  if (selectedSubject && selectedSubject !== '') {
    const subjectAssessmentIds = assessments
      .filter(a => a.subject_id === selectedSubject)
      .map(a => a.id)
    
    filteredTransactions = filteredTransactions.filter(t => {
      if (t.assessment_id) {
        return subjectAssessmentIds.includes(t.assessment_id)
      }
      return false // 手動添加的記錄不計入科目篩選
    })
  }

  // 步驟3：計算統計
  setFilteredSummary(calculateFilteredStats())
}, [selectedMonth, selectedSubject, transactions, assessments])
```

---

### **3. 計算統計**

```typescript
const calculateFilteredStats = () => {
  // 找到最近的歸零記錄
  const lastReset = findLastResetTransaction(filteredTransactions)
  let transactionsToCalculate = filteredTransactions
  let startingBalance = 0

  // 如果有歸零記錄，只計算歸零之後的交易
  if (lastReset) {
    startingBalance = lastReset.amount || 0
    const resetDateOnly = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()

    transactionsToCalculate = transactionsToCalculate.filter(t => {
      if (t.transaction_type === 'reset') return false
      const tDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime()
      return tDateOnly > resetDateOnly
    })
  }

  // 計算收入和支出
  const earned = transactionsToCalculate.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
  const spent = transactionsToCalculate.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  return {
    balance: startingBalance + earned - spent,
    total_earned: earned,
    total_spent: spent
  }
}
```

---

## 📋 篩選規則詳解

### **月份篩選**
```
規則：比較 transaction_date 的年-月

示例：
選擇：2025年12月
保留：
- 2025-12-01 的記錄 ✓
- 2025-12-16 的記錄 ✓
- 2025-12-31 的記錄 ✓

排除：
- 2025-11-30 的記錄 ✗
- 2026-01-01 的記錄 ✗
```

---

### **科目篩選**
```
規則：
1. 找出該科目的所有評量 ID
2. 只保留 assessment_id 屬於這些評量的交易記錄
3. 手動添加的記錄（無 assessment_id）不計入

示例：
選擇：📖 國語
國語評量 ID：[abc, def, ghi]

保留：
- assessment_id = abc 的記錄 ✓
- assessment_id = def 的記錄 ✓

排除：
- assessment_id = xyz（數學）的記錄 ✗
- assessment_id = null（手動記錄）的記錄 ✗
```

---

### **歸零記錄處理**
```
規則：
1. 找到篩選範圍內最近的歸零記錄
2. 起始金額 = 歸零記錄的 amount
3. 只計算歸零日期之後的交易
4. 歸零記錄本身不計入收支

示例：
篩選：2025年12月
歸零記錄：12/10 起始金額 $50

計算：
- 12/01-12/09 的記錄 ✗（在歸零前）
- 12/11-12/31 的記錄 ✓（在歸零後）
- 餘額 = $50 + 歸零後收入 - 歸零後支出
```

---

## 📊 示例數據對比

### **原始數據**
```
交易記錄：
11/20 國語考試 +$50
11/25 數學考試 +$30
12/01 購買文具 -$10
12/05 國語作業 +$20
12/10 歸零 $50
12/15 國語考試 +$50
12/20 數學作業 +$15
12/25 兌換禮物 -$20
```

---

### **全部記錄**
```
統計：
- 總收入：$165 (50+30+20+50+15)
- 總支出：$30 (10+20)
- 餘額：$50 + $165 - $30 = $185
```

---

### **篩選：12月**
```
統計：
- 總收入：$85 (20+50+15)
- 總支出：$30 (10+20)
- 餘額：$50 + $85 - $30 = $105

說明：
- 11月的記錄被排除
- 12/10 歸零後的記錄被計入
- 起始金額 $50
```

---

### **篩選：國語**
```
統計：
- 總收入：$120 (50+20+50)
- 總支出：$0
- 餘額：$50 + $120 - $0 = $170

說明：
- 只計入國語評量的獎金
- 數學評量和手動記錄被排除
- 起始金額 $50
```

---

### **篩選：國語 + 12月**
```
統計：
- 總收入：$70 (20+50)
- 總支出：$0
- 餘額：$50 + $70 - $0 = $120

說明：
- 只計入國語評量在12月的獎金
- 11月的國語記錄被排除
- 數學和手動記錄被排除
- 起始金額 $50
```

---

## ✅ 優勢總結

| 優勢 | 說明 |
|------|------|
| 🎯 **精準分析** | 可以精確了解特定時期或科目的收支 |
| 📊 **動態計算** | 即時根據篩選條件更新數據 |
| 💡 **易於理解** | 顯示與評量列表對應的獎金 |
| 🔍 **深入洞察** | 可以分析哪個科目或時期獎金最多 |
| ✅ **準確無誤** | 正確處理歸零記錄和手動記錄 |

---

## 🎓 使用建議

### **1. 分析月度表現**
```
建議：選擇特定月份
用途：了解本月的收支情況
場景：月末總結時查看本月獎金
```

---

### **2. 評估科目價值**
```
建議：選擇特定科目
用途：了解該科目帶來的總獎金
場景：決定是否要加強某個科目的學習
```

---

### **3. 單科月度分析**
```
建議：選擇科目 + 月份
用途：精確分析單科目在單月的表現
場景：制定下個月的學習計畫
```

---

### **4. 整體概覽**
```
建議：選擇全部月份 + 全部科目
用途：查看完整的累積獎金
場景：了解總體學習成果
```

---

## 📂 修改的文件

| 文件 | 說明 |
|------|------|
| `app/student/[id]/page.tsx` | ✅ 獲取 transactions 資料 |
| `app/student/[id]/page.tsx` | ✅ 傳遞 transactions 給子組件 |
| `StudentRecords.tsx` | ✅ 接收 transactions 參數 |
| `StudentRecords.tsx` | ✅ 添加篩選計算邏輯 |
| `StudentRecords.tsx` | ✅ 傳遞 filteredSummary 給 SubjectTabs |
| `FILTERED_BALANCE_GUIDE.md` | ✅ 完整功能說明文檔 |

---

## 🎨 UI 顯示邏輯

### **累積獎金卡片**
```tsx
<div className="bg-white rounded-lg p-6 mb-6">
  <div className="text-center">
    <p className="text-gray-600 text-lg">累積獎金</p>
    <p className="text-5xl font-bold text-blue-600">
      ${filteredSummary?.balance || 0}
    </p>
    <div className="flex justify-around mt-4">
      <div>
        <span className="text-gray-600">收入</span>
        <span className="text-green-600">
          +${filteredSummary?.total_earned || 0}
        </span>
      </div>
      <div>
        <span className="text-gray-600">支出</span>
        <span className="text-red-600">
          -${filteredSummary?.total_spent || 0}
        </span>
      </div>
    </div>
  </div>
</div>
```

---

## 🔄 數據流程

```
1. 用戶選擇篩選條件
   ↓
2. 觸發 useEffect
   ↓
3. 篩選 transactions
   ├─ 月份篩選
   └─ 科目篩選
   ↓
4. 找到歸零記錄
   ↓
5. 計算統計數據
   ├─ 起始金額
   ├─ 總收入
   ├─ 總支出
   └─ 餘額
   ↓
6. 更新 filteredSummary
   ↓
7. 傳遞給 SubjectTabs
   ↓
8. 顯示在累積獎金卡片
```

---

## 🎉 總結

### **核心價值**
```
動態篩選累積獎金
    ↓
根據月份和科目精準計算
    ↓
即時顯示對應的收支統計
    ↓
幫助用戶深入分析學習表現
    ↓
提供有價值的數據洞察
```

---

### **用戶體驗提升**
| 指標 | 說明 |
|------|------|
| 🎯 **精準** | 數據與篩選條件完全對應 |
| 📊 **直觀** | 一眼就能看懂收支情況 |
| 💡 **實用** | 可以做有針對性的分析 |
| ⚡ **即時** | 選擇後立即更新數據 |
| ✅ **準確** | 正確處理各種邊界情況 |

---

🎊 **現在累積獎金會根據科目與月份的篩選條件動態計算，讓數據分析更加精準實用！**

