# Wilbur's Reward Book (Wilbur 的獎勵存摺)

一個功能完整的學生獎勵管理系統，使用 Next.js、TypeScript、Tailwind CSS 和 Supabase 構建。

> 💡 **AI 協作開發**：此專案使用 [Cursor](https://cursor.sh) 配合 AI 的 vibe coding 模式開發，展示了現代 AI 輔助開發工作流程。

## 功能特色

- 📚 **學生管理**：添加、編輯、刪除學生，自訂頭像和背景顏色
- 📖 **科目管理**：為每個學生創建和管理多個科目
- 📝 **評量記錄**：記錄學生的考試、測驗、作業和專案成績
- 💰 **獎金存摺**：追蹤學生的獎金收入、支出和重置記錄
- 🎁 **獎勵規則**：設定靈活的獎勵規則（通用、學生專屬、科目專屬）
- 📊 **報表列印**：生成並列印學生的學習記錄和獎金存摺報表
- 🌐 **多語言支援**：支援繁體中文和英文
- 💾 **資料備份**：匯出/匯入 JSON 備份，支援資料庫儲存
- 🎨 **現代化 UI**：響應式設計，流暢的動畫效果

## 技術棧

- **框架**：Next.js 14 (App Router)
- **語言**：TypeScript
- **樣式**：Tailwind CSS
- **資料庫**：Supabase (PostgreSQL)
- **國際化**：next-intl
- **部署**：Vercel (推薦)

## 開始使用

### 環境需求

**部署需求（一鍵部署）：**
- GitHub 帳號（免費）- [註冊](https://github.com/signup)
- Vercel 帳號（免費）- [註冊](https://vercel.com/signup) - 可使用 GitHub 登入
- Supabase 帳號（免費）- [註冊](https://supabase.com)

**本地開發需求：**
- Node.js 18+ 
- npm 或 yarn
- Supabase 帳號和專案

### 安裝步驟

1. 克隆專案：
```bash
git clone https://github.com/con2000us/Wilbur-s-rewardbook.git
cd wilburs-rewardbook
```

2. 安裝依賴：
```bash
npm install
```

3. 設定環境變數：
創建 `.env.local` 文件並填入你的 Supabase 憑證：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. 執行資料庫遷移：
在 Supabase SQL Editor 中執行 `add-*.sql` 文件來建立必要的資料表。

5. 啟動開發伺服器：
```bash
npm run dev
```

6. 開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

## 專案結構

```
wilburs-rewardbook/
├── app/                    # Next.js App Router 頁面
│   ├── api/               # API 路由
│   ├── components/        # React 組件
│   ├── settings/          # 設定頁面
│   ├── student/           # 學生相關頁面
│   └── students/          # 學生管理頁面
├── lib/                   # 工具函數和配置
│   ├── i18n/             # 國際化配置
│   ├── supabase/         # Supabase 客戶端
│   └── utils/            # 工具函數
├── locales/              # 翻譯文件
│   ├── zh-TW.json       # 繁體中文
│   └── en.json          # 英文
└── public/              # 靜態資源
```

## 🚀 快速部署

### 一鍵部署到 Vercel（推薦）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook)

**步驟：**
1. 點擊上方按鈕
2. 使用 GitHub 帳號登入
3. 添加 Supabase 環境變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 點擊「Deploy」
5. 在 Supabase SQL Editor 中執行 `setup-database.sql`
6. 完成！🎉

### 部署到 Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/con2000us/Wilbur-s-rewardbook)

### 部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/con2000us/Wilbur-s-rewardbook)

### 使用此模板

點擊倉庫頂部的綠色 **"Use this template"** 按鈕來創建你自己的副本。

## 📋 部署指南

### 前置需求

部署前，你需要：
1. **Supabase 帳號**（免費）：[supabase.com](https://supabase.com)
2. **GitHub 帳號**（免費）

### 逐步部署指南

#### 1. 設置 Supabase（5 分鐘）

1. 前往 [supabase.com](https://supabase.com) 創建新專案
2. 等待專案準備完成
3. 在 Supabase 儀表板中進入 **SQL Editor**
4. 複製並貼上 `setup-database.sql` 的完整內容
5. 點擊 **Run** 執行 SQL
6. 前往 **Settings** → **API** 並複製：
   - **Project URL** → 這是你的 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** 金鑰 → 這是你的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. 部署到 Vercel（3 分鐘）

1. 點擊上方的 **"Deploy with Vercel"** 按鈕
2. 使用 GitHub 帳號登入
3. 點擊 **"New Project"**
4. 在 **Environment Variables** 中添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
   ```
5. 點擊 **"Deploy"**
6. 等待 2-3 分鐘完成部署
7. 訪問你的部署網站！🎉

### 其他部署選項

也可以部署到：
- **Netlify**：從 GitHub 導入並設置環境變數
- **Railway**：使用上方的 Railway 按鈕
- **Render**：使用上方的 Render 按鈕
- **自架伺服器**：使用 Docker 或任何 Node.js 主機

## 授權

MIT License

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 聯絡方式

如有問題或建議，請透過 GitHub Issues 聯繫。

