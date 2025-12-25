# 國際化 (i18n) 實現計劃

## 🎯 目標

1. ✅ 將所有中文分離成語言檔
2. ✅ 創建英文語言檔
3. ✅ 在設置中可以切換網頁語言
4. ✅ 支持動態語言切換（無需重新載入頁面）

---

## 📋 實現方案

### **方案選擇：next-intl**

**推薦使用 `next-intl`**，因為：
- ✅ 專為 Next.js 設計，完美支持 App Router
- ✅ 支持服務端和客戶端組件
- ✅ TypeScript 友好
- ✅ 簡單易用，性能優秀
- ✅ 支持動態語言切換

---

## 🗂️ 檔案結構

```
wilburs-rewardbook/
├── locales/                    # 語言檔案夾
│   ├── zh-TW.json             # 繁體中文
│   └── en.json                # 英文
├── lib/
│   └── i18n/
│       ├── request.ts         # i18n 配置
│       └── config.ts          # 語言設定
├── middleware.ts              # 語言路由中間件
└── app/
    ├── [locale]/              # 動態語言路由
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── ...
    └── components/
        └── LanguageSwitcher.tsx  # 語言切換器
```

---

## 📦 安裝步驟

### **1. 安裝 next-intl**

```bash
npm install next-intl
```

---

### **2. 創建語言檔案**

#### **locales/zh-TW.json** （繁體中文）
```json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "edit": "編輯",
    "delete": "刪除",
    "add": "添加",
    "back": "返回",
    "confirm": "確認",
    "close": "關閉",
    "loading": "載入中...",
    "success": "成功",
    "error": "錯誤"
  },
  "nav": {
    "home": "首頁",
    "students": "學生管理",
    "settings": "設置"
  },
  "home": {
    "title": "Wilbur's RewardBook",
    "subtitle": "學習獎勵追蹤系統",
    "noStudents": "尚未添加任何學生",
    "addStudent": "添加學生",
    "features": {
      "records": {
        "title": "學習記錄",
        "desc": "追蹤每次考試、作業的成績與獎金"
      },
      "rewards": {
        "title": "獎金規則",
        "desc": "設定不同分數等級的獎金制度"
      },
      "subjects": {
        "title": "科目管理",
        "desc": "管理各個學習科目與評量"
      },
      "passbook": {
        "title": "獎金存摺",
        "desc": "記錄獎金收入與支出明細"
      }
    }
  },
  "student": {
    "learningRecord": "{name} 的學習記錄",
    "manageSubjects": "管理科目",
    "passbook": "獎金存摺",
    "addAssessment": "添加評量",
    "accumulatedBonus": "累積獎金",
    "income": "收入",
    "expense": "支出",
    "totalSubjects": "總科目數",
    "totalAssessments": "總評量數",
    "completed": "已完成",
    "allSubjects": "全部",
    "selectMonth": "選擇月份",
    "allMonths": "全部月份",
    "printReport": "列印報表"
  },
  "assessment": {
    "title": "評量名稱",
    "type": "評量類型",
    "types": {
      "exam": "考試",
      "quiz": "小考",
      "homework": "作業",
      "project": "專題"
    },
    "subject": "科目",
    "dueDate": "截止/考試日期",
    "score": "分數",
    "maxScore": "滿分",
    "percentage": "百分比",
    "reward": "獎金",
    "status": "狀態",
    "statuses": {
      "pending": "待完成",
      "completed": "已完成"
    }
  },
  "transaction": {
    "passbook": "獎金存摺",
    "addRecord": "新增記錄",
    "eventName": "事件名稱",
    "category": "分類標籤",
    "date": "日期",
    "amount": "金額",
    "type": "記錄類型",
    "types": {
      "earn": "收入",
      "spend": "支出",
      "reset": "歸零"
    },
    "quickSelect": "快速選擇",
    "startingBalance": "起始金額",
    "totalIncome": "總收入",
    "totalExpense": "總支出",
    "balance": "餘額"
  },
  "subject": {
    "name": "科目名稱",
    "icon": "圖示",
    "color": "顏色",
    "manageSubjects": "管理科目",
    "addSubject": "添加科目",
    "editSubject": "編輯科目",
    "rewardRules": "獎金規則"
  },
  "settings": {
    "title": "系統設置",
    "language": "語言設定",
    "selectLanguage": "選擇語言",
    "languages": {
      "zh-TW": "繁體中文",
      "en": "English"
    }
  },
  "print": {
    "title": "{name} 學習記錄",
    "printDate": "列印日期",
    "monthReport": "{month} 報表",
    "allRecords": "全部記錄",
    "printPage": "列印此頁",
    "avgScore": "平均分數",
    "totalReward": "總獎金",
    "assessmentDetails": "評量記錄明細",
    "noRecords": "此期間無評量記錄"
  },
  "messages": {
    "saveSuccess": "保存成功",
    "saveFailed": "保存失敗",
    "deleteConfirm": "確定要刪除嗎？",
    "deleteSuccess": "刪除成功",
    "deleteFailed": "刪除失敗"
  }
}
```

---

#### **locales/en.json** （英文）
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "add": "Add",
    "back": "Back",
    "confirm": "Confirm",
    "close": "Close",
    "loading": "Loading...",
    "success": "Success",
    "error": "Error"
  },
  "nav": {
    "home": "Home",
    "students": "Students",
    "settings": "Settings"
  },
  "home": {
    "title": "Wilbur's RewardBook",
    "subtitle": "Learning Reward Tracking System",
    "noStudents": "No students added yet",
    "addStudent": "Add Student",
    "features": {
      "records": {
        "title": "Learning Records",
        "desc": "Track grades and rewards for tests and assignments"
      },
      "rewards": {
        "title": "Reward Rules",
        "desc": "Set up reward systems for different grade levels"
      },
      "subjects": {
        "title": "Subject Management",
        "desc": "Manage learning subjects and assessments"
      },
      "passbook": {
        "title": "Reward Passbook",
        "desc": "Record income and expense details"
      }
    }
  },
  "student": {
    "learningRecord": "{name}'s Learning Record",
    "manageSubjects": "Manage Subjects",
    "passbook": "Reward Passbook",
    "addAssessment": "Add Assessment",
    "accumulatedBonus": "Accumulated Rewards",
    "income": "Income",
    "expense": "Expense",
    "totalSubjects": "Total Subjects",
    "totalAssessments": "Total Assessments",
    "completed": "Completed",
    "allSubjects": "All",
    "selectMonth": "Select Month",
    "allMonths": "All Months",
    "printReport": "Print Report"
  },
  "assessment": {
    "title": "Assessment Title",
    "type": "Assessment Type",
    "types": {
      "exam": "Exam",
      "quiz": "Quiz",
      "homework": "Homework",
      "project": "Project"
    },
    "subject": "Subject",
    "dueDate": "Due/Exam Date",
    "score": "Score",
    "maxScore": "Max Score",
    "percentage": "Percentage",
    "reward": "Reward",
    "status": "Status",
    "statuses": {
      "pending": "Pending",
      "completed": "Completed"
    }
  },
  "transaction": {
    "passbook": "Reward Passbook",
    "addRecord": "Add Record",
    "eventName": "Event Name",
    "category": "Category",
    "date": "Date",
    "amount": "Amount",
    "type": "Record Type",
    "types": {
      "earn": "Income",
      "spend": "Expense",
      "reset": "Reset"
    },
    "quickSelect": "Quick Select",
    "startingBalance": "Starting Balance",
    "totalIncome": "Total Income",
    "totalExpense": "Total Expense",
    "balance": "Balance"
  },
  "subject": {
    "name": "Subject Name",
    "icon": "Icon",
    "color": "Color",
    "manageSubjects": "Manage Subjects",
    "addSubject": "Add Subject",
    "editSubject": "Edit Subject",
    "rewardRules": "Reward Rules"
  },
  "settings": {
    "title": "System Settings",
    "language": "Language Settings",
    "selectLanguage": "Select Language",
    "languages": {
      "zh-TW": "繁體中文",
      "en": "English"
    }
  },
  "print": {
    "title": "{name}'s Learning Record",
    "printDate": "Print Date",
    "monthReport": "{month} Report",
    "allRecords": "All Records",
    "printPage": "Print This Page",
    "avgScore": "Average Score",
    "totalReward": "Total Reward",
    "assessmentDetails": "Assessment Details",
    "noRecords": "No records for this period"
  },
  "messages": {
    "saveSuccess": "Saved successfully",
    "saveFailed": "Failed to save",
    "deleteConfirm": "Are you sure you want to delete?",
    "deleteSuccess": "Deleted successfully",
    "deleteFailed": "Failed to delete"
  }
}
```

---

### **3. 創建 i18n 配置**

#### **lib/i18n/config.ts**
```typescript
export const locales = ['zh-TW', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  'en': 'English'
}
```

---

#### **lib/i18n/request.ts**
```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale } from './config'

export default getRequestConfig(async () => {
  // 從 cookie 或路由獲取語言
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default
  }
})
```

---

### **4. 創建語言切換器**

#### **app/components/LanguageSwitcher.tsx**
```typescript
'use client'

import { useLocale } from 'next-intl'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()

  const handleLanguageChange = (newLocale: Locale) => {
    // 保存到 cookie
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    
    // 刷新頁面以應用新語言
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-700">
        🌐 語言 / Language
      </label>
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

### **5. 更新 Next.js 配置**

#### **next.config.js**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... 其他配置
}

module.exports = nextConfig
```

---

#### **middleware.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale } from './lib/i18n/config'

export function middleware(request: NextRequest) {
  // 從 cookie 獲取語言設定
  const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale
  
  // 可以在這裡添加其他邏輯
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
}
```

---

## 📝 使用方法

### **1. 在服務端組件中使用**

```typescript
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('home')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  )
}
```

---

### **2. 在客戶端組件中使用**

```typescript
'use client'

import { useTranslations } from 'next-intl'

export default function ClientComponent() {
  const t = useTranslations('student')
  
  return (
    <button>{t('addAssessment')}</button>
  )
}
```

---

### **3. 使用參數插值**

```typescript
const t = useTranslations('student')

// 使用: learningRecord: "{name} 的學習記錄"
<h1>{t('learningRecord', { name: student.name })}</h1>
```

---

## 🔄 實施步驟

### **階段 1：基礎設置**
1. ✅ 安裝 next-intl
2. ✅ 創建語言檔案 (zh-TW.json, en.json)
3. ✅ 設置 i18n 配置
4. ✅ 創建語言切換器

---

### **階段 2：頁面改造**
逐步改造現有頁面，將硬編碼的中文替換為 `t()` 函數：

**優先級排序**：
1. **首頁** (`app/page.tsx`)
2. **學生頁面** (`app/student/[id]/page.tsx`)
3. **評量相關** (add-assessment, edit)
4. **科目管理** (subjects)
5. **獎金存摺** (transactions)
6. **設置頁面** (settings)
7. **打印頁面** (print)

---

### **階段 3：組件改造**
1. **StudentRecords.tsx**
2. **SubjectTabs.tsx**
3. **TransactionRecords.tsx**
4. **表單組件**

---

### **階段 4：測試與優化**
1. ✅ 測試語言切換
2. ✅ 檢查所有文本是否已翻譯
3. ✅ 優化翻譯質量
4. ✅ 處理邊界情況

---

## ⚠️ 注意事項

### **1. 避免硬編碼**
```typescript
// ❌ 不好
<h1>學生管理</h1>

// ✅ 好
<h1>{t('students')}</h1>
```

---

### **2. 處理複數形式**
```json
{
  "assessments": {
    "zero": "無評量",
    "one": "{count} 個評量",
    "other": "{count} 個評量"
  }
}
```

---

### **3. 處理日期和數字格式**
```typescript
import { useFormatter } from 'next-intl'

const format = useFormatter()
const dateStr = format.dateTime(new Date(), {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
```

---

## 📊 估計工作量

| 階段 | 文件數 | 預估時間 |
|------|--------|----------|
| **基礎設置** | 5 | 1-2 小時 |
| **語言檔案** | 2 | 2-3 小時 |
| **頁面改造** | 15+ | 4-6 小時 |
| **組件改造** | 10+ | 3-4 小時 |
| **測試優化** | - | 1-2 小時 |
| **總計** | 30+ | **11-17 小時** |

---

## 🎯 下一步

### **選項 A：完整實施**
我可以幫你完整實施所有改動，包括：
- 創建所有配置文件
- 創建完整的語言檔案
- 逐步改造所有頁面和組件
- 測試並優化

---

### **選項 B：逐步實施**
我們可以分階段進行：
1. 先設置基礎框架
2. 改造 1-2 個示例頁面
3. 你學會後自行改造其他頁面
4. 我協助解決問題

---

### **選項 C：手動方案**
如果不想用 i18n 庫，可以使用簡單的手動方案：
- 創建簡單的翻譯對象
- 使用 React Context 管理語言
- 手動實現語言切換

---

## 💡 建議

**推薦選擇選項 A（完整實施）**，因為：
1. ✅ 一次性完成，避免後續問題
2. ✅ 使用專業工具，功能完整
3. ✅ 易於維護和擴展
4. ✅ 我可以自動化處理大部分工作

---

## 🎊 總結

這個國際化實施計劃包含：
- ✅ 完整的技術方案
- ✅ 詳細的實施步驟
- ✅ 代碼示例和模板
- ✅ 注意事項和最佳實踐

**你想要我現在開始實施嗎？** 還是你想要先看看某個具體部分的詳細實現？

