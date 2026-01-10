# 學生頁面 Icon 對應關係參考

本文檔記錄了學生相關頁面中使用的 Material Symbols 圖標對應關係，確保整個應用程式中圖標使用的一致性。

## 首頁導航 Icon

首頁底部導航欄使用的圖標：

| 功能 | Icon | 路由 | 說明 |
|------|------|------|------|
| 評量 (Assessments) | `assignment` | `/student/{id}` | 學習記錄頁面 |
| 科目設定 (Subjects) | `menu_book` | `/student/{id}/subjects` | 科目管理頁面 |
| 獎金存摺 (Transactions) | `attach_money` | `/student/{id}/transactions` | 獎金存摺頁面 |

### 首頁導航 HTML 結構參考

```html
<div class="glass-nav flex justify-between items-center rounded-full px-8 py-4 shadow-lg">
  <!-- 評量 -->
  <a aria-label="Assessments" 
     class="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer" 
     title="評量" 
     href="/student/{id}">
    <span class="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]" 
          style="font-size: 2.34rem;">assignment</span>
  </a>
  
  <!-- 科目設定 -->
  <a aria-label="Subjects" 
     class="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer" 
     title="科目設定" 
     href="/student/{id}/subjects">
    <span class="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]" 
          style="font-size: 2.34rem;">menu_book</span>
  </a>
  
  <!-- 獎金存摺 -->
  <a aria-label="Transactions" 
     class="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer" 
     title="獎金存折" 
     href="/student/{id}/transactions">
    <span class="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]" 
          style="font-size: 2.34rem;">attach_money</span>
  </a>
</div>
```

## 切換學生 Modal Icon

學習記錄頁面中「切換學生」下拉選單使用的圖標：

| 功能 | Icon | 路由 | 說明 |
|------|------|------|------|
| 獎金存摺 | `attach_money` | `/student/{id}/transactions` | 與首頁導航一致 |
| 科目管理 | `menu_book` | `/student/{id}/subjects` | 與首頁導航一致 |
| 學生設定 | `settings` | 觸發自定義事件 | 打開學生設定 Modal |
| 返回首頁 | `📚` (emoji) | `/` | 與首頁標題 icon 一致 |

### 切換學生 Modal 使用位置

- **檔案位置**: `wilburs-rewardbook/app/student/[id]/components/StudentSwitchModal.tsx`
- **組件**: `StudentSwitchModal`
- **顯示時機**: 點擊「切換學生」按鈕後顯示的下拉選單

## Icon 使用規範

### 一致性原則

1. **相同功能使用相同 Icon**
   - 獎金存摺：統一使用 `attach_money`
   - 科目管理：統一使用 `menu_book`
   - 學習記錄：統一使用 `assignment`（首頁導航）

2. **Icon 大小規範**
   - 首頁導航：`font-size: 2.34rem` (約 37.44px)
   - 切換學生 Modal：`text-lg` (約 18px)

3. **Icon 顏色規範**
   - 首頁導航：白色 (`text-white`)，hover 時變為綠色 (`#30e87a`)
   - 切換學生 Modal：根據功能使用不同顏色
     - 獎金存摺：綠色 (`text-green-600`)
     - 科目管理：橙色 (`text-orange-600`)
     - 學生設定：紫色 (`text-purple-600`)

## 首頁標題 Icon

首頁主標題使用的圖標：

| 功能 | Icon | 位置 | 說明 |
|------|------|------|------|
| 首頁標題 | `📚` (emoji) | 首頁主標題 | 與返回首頁 icon 一致 |

### 首頁標題結構參考

```tsx
<h1 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl animate-fade-in">
  📚 {siteName}
</h1>
<p className="text-lg text-purple-100 font-medium mb-8">
  {t('subtitle')}  {/* 學習獎勵追蹤系統 */}
</p>
```

**字體大小：**
- 標題：`text-4xl` (36px，縮小50%後)
- 副標題：`text-lg` (18px，縮小30%後)

## 更新記錄

### 2025-01-09
- **返回首頁 icon 改為與首頁標題一致**
  - 返回首頁：`👨‍👧` → `📚` (與首頁標題 icon 一致)
- **首頁標題字體大小調整**
  - 標題：`text-8xl` → `text-4xl` (縮小50%)
  - 副標題「學習獎勵追蹤系統」：`text-2xl` → `text-lg` (縮小30%)
- 將切換學生 Modal 中的圖標改為與首頁導航一致
  - 獎金存摺：`account_balance_wallet` → `attach_money`
  - 科目管理：`folder_open` → `menu_book`
  - 學生設定：保持 `settings` 不變

## 注意事項

1. 當需要新增學生相關頁面時，請參考此文件選擇合適的 Icon
2. 確保相同功能在不同位置使用相同的 Icon，保持一致性
3. 如需修改 Icon，請同時更新此文件
