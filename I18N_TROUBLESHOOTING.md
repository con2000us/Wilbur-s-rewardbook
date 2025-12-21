# 國際化故障排除指南

## ✅ 已修復的問題

### **問題：首頁無法顯示**

#### **錯誤訊息**
```
Error: Expected a suspended thenable. This is a bug in React.
```

#### **原因**
在**服務器組件 (Server Component)** 中使用了**客戶端鉤子 (Client Hook)**。

---

## 🔧 解決方案

### **關鍵規則**

在 Next.js App Router + next-intl 中：

#### **服務器組件 (Server Component)**
✅ 使用 `getTranslations` 從 `'next-intl/server'` 導入
```typescript
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations('home')
  
  return <h1>{t('title')}</h1>
}
```

---

#### **客戶端組件 (Client Component)**
✅ 使用 `useTranslations` 從 `'next-intl'` 導入
```typescript
'use client'

import { useTranslations } from 'next-intl'

export default function MyComponent() {
  const t = useTranslations('home')
  
  return <h1>{t('title')}</h1>
}
```

---

## 📋 已修復的文件

### **1. app/page.tsx**
```typescript
// ❌ 錯誤 (導致首頁無法顯示)
import { useTranslations } from 'next-intl'
const t = useTranslations('home')

// ✅ 正確
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('home')
```

---

### **2. app/settings/page.tsx**
```typescript
// ❌ 錯誤
import { useTranslations } from 'next-intl'
const t = useTranslations('settings')

// ✅ 正確
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('settings')
```

---

## 🎯 如何判斷使用哪個？

### **判斷標準**

| 特徵 | 服務器組件 | 客戶端組件 |
|------|------------|------------|
| **文件開頭** | 無 `'use client'` | 有 `'use client'` |
| **函數類型** | `async function` | 普通函數 |
| **鉤子使用** | 不能用 `useState`, `useEffect` 等 | 可以用所有 React 鉤子 |
| **翻譯導入** | `getTranslations` from `next-intl/server` | `useTranslations` from `next-intl` |
| **調用方式** | `const t = await getTranslations()` | `const t = useTranslations()` |

---

## ✅ 測試步驟

### **1. 重新啟動開發服務器**
```cmd
# 停止當前服務器 (Ctrl + C)
# 然後重新啟動
npm run dev
```

---

### **2. 訪問首頁**
```
http://localhost:3000
```

**預期結果**：
- ✅ 首頁正常顯示
- ✅ 看到 "📚 Wilbur's RewardBook"
- ✅ 看到學生列表
- ✅ 看到功能卡片

---

### **3. 測試語言切換**
1. 點擊右上角 "⚙️ 設置"
2. 選擇 "English"
3. 返回首頁

**預期結果**：
- ✅ 頁面刷新
- ✅ 所有文字變成英文
- ✅ "學生管理" → "Students"
- ✅ "設置" → "Settings"

---

### **4. 測試語言持久化**
1. 關閉瀏覽器
2. 重新打開
3. 訪問首頁

**預期結果**：
- ✅ 語言保持為上次選擇的語言（存儲在 Cookie 中）

---

## 🚀 未來改造頁面時的注意事項

### **服務器組件頁面 (app/*/page.tsx)**
```typescript
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations('namespace')
  
  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  )
}
```

---

### **客戶端組件 (components/*.tsx)**
```typescript
'use client'

import { useTranslations } from 'next-intl'

export default function MyComponent() {
  const t = useTranslations('namespace')
  
  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  )
}
```

---

## 📝 快速檢查清單

改造頁面或組件時，按照以下步驟：

### **步驟 1：判斷組件類型**
- [ ] 檢查文件開頭是否有 `'use client'`
- [ ] 檢查函數是否為 `async`

### **步驟 2：選擇正確的導入**
- [ ] 服務器組件：`import { getTranslations } from 'next-intl/server'`
- [ ] 客戶端組件：`import { useTranslations } from 'next-intl'`

### **步驟 3：使用翻譯函數**
- [ ] 服務器組件：`const t = await getTranslations('namespace')`
- [ ] 客戶端組件：`const t = useTranslations('namespace')`

### **步驟 4：替換硬編碼文字**
- [ ] 將所有中文字串替換為 `t('key')`
- [ ] 確保語言文件中包含對應的 key

### **步驟 5：測試**
- [ ] 重啟開發服務器
- [ ] 訪問頁面確認無錯誤
- [ ] 切換語言測試

---

## 🎉 當前狀態

### ✅ **已正常工作**
- 首頁 (app/page.tsx)
- 設置頁面 (app/settings/page.tsx)
- 語言切換器組件 (app/components/LanguageSwitcher.tsx)

### ⏳ **待改造**
- 學生詳情頁面
- 所有表單頁面
- 所有管理頁面
- 打印頁面

---

## 💡 提示

如果遇到類似錯誤：
```
Error: Expected a suspended thenable
```

**檢查步驟**：
1. 確認是服務器組件還是客戶端組件
2. 使用正確的導入方式
3. 確保 `async/await` 語法正確

---

🎊 **問題已解決！現在可以正常訪問首頁和設置頁面了！**

