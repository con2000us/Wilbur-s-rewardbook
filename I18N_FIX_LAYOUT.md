# 修復設置頁面錯誤

## ✅ 問題已修復

### **錯誤原因**
`LanguageSwitcher` 組件使用了 `useLocale()` 鉤子，但應用程序缺少 next-intl 的 Provider 配置。

---

## 🔧 解決方案

### **修改的文件：app/layout.tsx**

#### **修改前**
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
```

#### **修改後**
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { defaultLocale } from '@/lib/i18n/config';

export default async function RootLayout({ children }) {
  // 從 cookie 獲取當前語言
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
  
  // 動態加載對應語言的翻譯文件
  const messages = (await import(`../locales/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## 📋 關鍵改動

### **1. 添加 NextIntlClientProvider**
```typescript
<NextIntlClientProvider locale={locale} messages={messages}>
  {children}
</NextIntlClientProvider>
```

這個 Provider 為整個應用程序提供：
- ✅ 當前語言設置
- ✅ 翻譯消息
- ✅ 使客戶端鉤子（如 `useLocale()`, `useTranslations()`）正常工作

---

### **2. 動態語言檢測**
```typescript
const cookieStore = await cookies();
const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
```

從 Cookie 中讀取用戶選擇的語言，默認為繁體中文。

---

### **3. 動態加載翻譯文件**
```typescript
const messages = (await import(`../locales/${locale}.json`)).default;
```

根據當前語言動態導入對應的翻譯文件：
- `zh-TW` → `locales/zh-TW.json`
- `en` → `locales/en.json`

---

## 🧪 測試步驟

### **1. 重新啟動開發服務器**
```cmd
# 停止當前服務器 (Ctrl + C)
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

---

### **3. 點擊設置按鈕**
```
點擊右上角 "⚙️ 設置"
```

**預期結果**：
- ✅ 成功進入設置頁面（不再報錯）
- ✅ 看到語言選擇器
- ✅ 當前選擇為 "繁體中文"

---

### **4. 切換語言**
1. 在設置頁面選擇 "English"
2. 觀察頁面刷新
3. 返回首頁

**預期結果**：
- ✅ 頁面刷新後所有文字變成英文
- ✅ "學生管理" → "Students"
- ✅ "設置" → "Settings"
- ✅ 標題變成 "Learning Reward Tracking System"

---

### **5. 再次訪問設置頁面**
```
再次點擊右上角 "⚙️ Settings"
```

**預期結果**：
- ✅ 設置頁面顯示英文
- ✅ "System Settings"
- ✅ "Language Settings"
- ✅ 當前選擇為 "English"

---

## 🎯 工作原理

### **架構圖**
```
RootLayout (app/layout.tsx)
├── 讀取 Cookie 中的語言設置
├── 加載對應的翻譯文件
├── 提供 NextIntlClientProvider
│   ├── locale: 'zh-TW' 或 'en'
│   └── messages: 翻譯數據
└── 渲染子組件
    ├── 服務器組件可以使用 getTranslations()
    └── 客戶端組件可以使用 useTranslations()
```

---

## 📝 完整的國際化流程

### **1. 用戶訪問網站**
```
用戶打開瀏覽器 → http://localhost:3000
```

### **2. RootLayout 執行**
```typescript
// 讀取 Cookie
const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh-TW'

// 加載翻譯文件
const messages = await import(`../locales/${locale}.json`)

// 提供 Provider
<NextIntlClientProvider locale={locale} messages={messages}>
```

### **3. 頁面渲染**
```typescript
// 服務器組件
const t = await getTranslations('home')
<h1>{t('title')}</h1>  // "Wilbur's RewardBook"

// 客戶端組件
const t = useTranslations('settings')
<h2>{t('language')}</h2>  // "語言設定"
```

### **4. 用戶切換語言**
```typescript
// LanguageSwitcher 組件
Cookies.set('NEXT_LOCALE', 'en', { expires: 365 })
router.refresh()  // 重新加載頁面
```

### **5. 頁面重新渲染**
```
Cookie 更新 → RootLayout 重新執行 → 
加載 en.json → 所有文字變成英文
```

---

## 🎉 現在應該工作正常了！

### ✅ **可用功能**
- 首頁（中英文切換）
- 設置頁面（語言切換器）
- Cookie 持久化（刷新後保持語言選擇）

### ⏳ **待改造頁面**
- 學生詳情頁面
- 所有表單頁面
- 所有管理頁面

---

## 💡 下一步

測試成功後，我可以繼續改造剩餘頁面。

**請告訴我測試結果！** 😊

