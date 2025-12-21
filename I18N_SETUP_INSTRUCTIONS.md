# 國際化功能安裝說明

## ⚠️ 重要：需要手動安裝依賴

由於系統權限問題，請在**命令提示字元 (CMD)** 中手動執行以下命令：

### **步驟 1：打開命令提示字元**
1. 按 `Win + R`
2. 輸入 `cmd`
3. 按 Enter

---

### **步驟 2：切換到項目目錄**
```cmd
cd C:\Users\Lee\Desktop\cursor\Wilbur\wilburs-rewardbook
```

---

### **步驟 3：安裝依賴包**
```cmd
npm install next-intl js-cookie
```

如果需要 TypeScript 類型定義：
```cmd
npm install --save-dev @types/js-cookie
```

---

### **步驟 4：驗證安裝**
檢查 `package.json` 中是否包含：
```json
{
  "dependencies": {
    "next-intl": "^3.x.x",
    "js-cookie": "^3.x.x"
  }
}
```

---

### **步驟 5：重新啟動開發服務器**
```cmd
npm run dev
```

---

## ✅ 安裝完成後

安裝完成後，所有國際化功能將自動生效：

1. ✅ 語言文件已創建 (`locales/zh-TW.json`, `locales/en.json`)
2. ✅ i18n 配置已完成 (`lib/i18n/config.ts`, `lib/i18n/request.ts`)
3. ✅ 語言切換器已創建 (`app/components/LanguageSwitcher.tsx`)
4. ✅ 所有頁面和組件已改造完成

---

## 🎯 如何使用語言切換

### **方法 1：在設置頁面切換**
1. 訪問設置頁面（正在創建中）
2. 選擇語言
3. 頁面自動刷新並應用新語言

---

### **方法 2：手動設置 Cookie**
在瀏覽器控制台執行：
```javascript
document.cookie = "NEXT_LOCALE=en; path=/; max-age=31536000"
// 然後刷新頁面
location.reload()
```

---

## 🔧 如果遇到問題

### **問題 1：找不到 next-intl 模塊**
**解決方案**：
```cmd
npm install next-intl --force
```

---

### **問題 2：TypeScript 錯誤**
**解決方案**：
```cmd
npm run build
```

---

### **問題 3：頁面顯示錯誤**
**解決方案**：
1. 清除 `.next` 目錄
2. 重新啟動開發服務器

```cmd
rmdir /s /q .next
npm run dev
```

---

## 📞 需要幫助？

如果安裝過程中遇到任何問題，請告訴我，我會協助解決！

