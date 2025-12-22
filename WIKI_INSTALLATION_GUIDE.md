# 📖 詳細安裝指南 - 超詳細步驟說明

> **專為科技小白設計，每個步驟都有截圖和說明！**

## 🎯 目標

完成這個指南後，你將擁有一個：
- ✅ 完全免費的學生成績管理系統
- ✅ 可以在任何裝置上使用（手機、平板、電腦）
- ✅ 有密碼保護，資料安全
- ✅ 可以隨時備份和還原資料

## ⏱️ 預計時間

- **總時間**：約 10-15 分鐘
- **註冊帳號**：5 分鐘（3 個帳號）
- **設置資料庫**：3 分鐘
- **部署網站**：3 分鐘
- **測試使用**：2 分鐘

## 📋 準備工作

在開始之前，請準備：
- ✅ 一台可以上網的電腦或手機
- ✅ 一個 Email 信箱（用來註冊帳號）
- ✅ 10-15 分鐘的時間
- ✅ 一杯咖啡或茶（放鬆心情 😊）

## 步驟 1：註冊 GitHub 帳號（2 分鐘）

### 為什麼需要 GitHub？
GitHub 是用來存放程式碼的地方。我們需要它來部署網站。

### 如何註冊？

1. **打開瀏覽器**，前往：https://github.com/signup

2. **填寫註冊資訊**：
   - Username（用戶名）：選擇一個你喜歡的名字
   - Email（電子郵件）：輸入你的 Email
   - Password（密碼）：設定一個安全的密碼
   - 勾選「I agree to the Terms of Service」

3. **驗證 Email**：
   - 檢查你的 Email 信箱
   - 點擊 GitHub 發送的驗證連結

4. **完成！** ✅

> 💡 **小提示**：如果已經有 GitHub 帳號，可以跳過這個步驟。

---

## 步驟 2：註冊 Vercel 帳號（1 分鐘）

### 為什麼需要 Vercel？
Vercel 是用來託管（放置）網站的地方。它會讓你的網站可以在網路上被訪問。

### 如何註冊？

1. **前往**：https://vercel.com/signup

2. **選擇註冊方式**：
   - 建議選擇「Continue with GitHub」（用 GitHub 帳號登入）
   - 這樣就不需要再填寫資料

3. **授權 Vercel**：
   - 點擊「Authorize Vercel」
   - 允許 Vercel 存取你的 GitHub 帳號

4. **完成！** ✅

> 💡 **小提示**：使用 GitHub 登入最簡單，因為你已經有 GitHub 帳號了。

---

## 步驟 3：註冊 Supabase 帳號（2 分鐘）

### 為什麼需要 Supabase？
Supabase 是用來存放資料的地方。所有學生的成績、記錄都會存在這裡。

### 如何註冊？

1. **前往**：https://supabase.com

2. **點擊「Start your project」**或「Sign up」

3. **選擇註冊方式**：
   - 建議選擇「Continue with GitHub」
   - 或使用 Email 註冊

4. **填寫組織資訊**：
   - Organization Name（組織名稱）：可以填你的名字或補習班名稱
   - 選擇一個 Region（地區）：選擇離你最近的（例如：Southeast Asia）

5. **完成！** ✅

---

## 步驟 4：設置 Supabase 資料庫（3 分鐘）

### 4.1 創建新專案

1. **登入 Supabase**後，點擊「New Project」

2. **填寫專案資訊**：
   - **Name**（專案名稱）：例如 `wilburs-rewardbook` 或 `我的成績系統`
   - **Database Password**（資料庫密碼）：
     - 設定一個強密碼（至少 12 個字元）
     - ⚠️ **重要**：請記下這個密碼！以後可能會用到
     - 建議：使用密碼管理器保存
   - **Region**（地區）：選擇離你最近的

3. **點擊「Create new project」**

4. **等待 2-3 分鐘**：Supabase 正在創建你的資料庫

### 4.2 設置資料庫表格

1. **等待專案創建完成**後，點擊左側選單的「SQL Editor」

2. **點擊「New query」**（新建查詢）

3. **打開這個檔案**：`setup-database.sql`
   - 在 GitHub 專案頁面找到這個檔案
   - 點擊檔案名稱
   - 點擊右上角的「Raw」按鈕
   - 全選（Ctrl+A）並複製（Ctrl+C）所有內容

4. **貼上到 Supabase SQL Editor**：
   - 在 SQL Editor 中貼上剛才複製的內容
   - 點擊右下角的「Run」按鈕（或按 Ctrl+Enter）

5. **確認執行成功**：
   - 應該會看到「Success. No rows returned」或類似的成功訊息
   - 如果看到錯誤，請檢查是否完整複製了所有內容

### 4.3 取得 API 金鑰

1. **點擊左側選單的「Settings」**（設定）

2. **點擊「API」**

3. **複製以下兩個資訊**：
   - **Project URL**（專案網址）：
     - 在「Project URL」區塊中
     - 點擊「Copy」按鈕複製
     - 例如：`https://xxxxx.supabase.co`
   - **anon public key**（公開金鑰）：
     - 在「Project API keys」區塊中
     - 找到「anon public」這一列
     - 點擊眼睛圖示顯示密碼
     - 點擊「Copy」按鈕複製
     - 這是一串很長的文字

4. **保存這兩個資訊**：
   - 暫時記在記事本或文件中
   - 等一下部署時會用到

> 💡 **小提示**：這兩個資訊很重要，但不用擔心，如果忘記了可以隨時回來查看。

---

## 步驟 5：部署到 Vercel（3 分鐘）

### 5.1 開始部署

1. **前往專案 GitHub 頁面**：
   - https://github.com/con2000us/Wilbur-s-rewardbook
   - 或搜尋「Wilbur-s-rewardbook」

2. **點擊「Deploy with Vercel」按鈕**：
   - 在 README 頁面頂部
   - 或直接前往：https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook

3. **登入 Vercel**（如果還沒登入）

4. **點擊「New Project」**

### 5.2 設置環境變數

在部署之前，需要設置 3 個環境變數：

1. **找到「Environment Variables」區塊**

2. **添加第一個變數**：
   - **Name**（名稱）：`NEXT_PUBLIC_SUPABASE_URL`
   - **Value**（值）：貼上剛才從 Supabase 複製的「Project URL」
   - 點擊「Add」

3. **添加第二個變數**：
   - **Name**：`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**：貼上剛才從 Supabase 複製的「anon public key」
   - 點擊「Add」

4. **添加第三個變數**（密碼保護）：
   - **Name**：`SITE_PASSWORD`
   - **Value**：設定一個強密碼（例如：`MyStr0ng!P@ssw0rd2024`）
   - ⚠️ **重要**：請記下這個密碼！這是用來登入網站的密碼
   - 點擊「Add」

### 5.3 開始部署

1. **確認所有環境變數都已添加**

2. **點擊「Deploy」按鈕**

3. **等待 2-3 分鐘**：
   - 可以看到部署進度
   - 等待「Building」和「Deploying」完成

4. **部署完成！** ✅
   - 會看到「Congratulations!」訊息
   - 會顯示你的網站網址（例如：`https://your-project.vercel.app`）

### 5.4 測試網站

1. **點擊「Visit」按鈕**或複製網站網址

2. **應該會看到登入頁面**：
   - 輸入剛才設定的 `SITE_PASSWORD`
   - 點擊「登入」

3. **成功進入網站！** 🎉

---

## 步驟 6：開始使用（2 分鐘）

### 6.1 添加第一個學生

1. **點擊「添加學生」按鈕**

2. **填寫學生資訊**：
   - 姓名：例如「小明」
   - Email（可選）：可以留空
   - 頭像：選擇一個表情符號
   - 背景顏色：選擇一個顏色

3. **點擊「保存」**

### 6.2 添加科目

1. **點擊學生的「科目」標籤**

2. **點擊「添加科目」**

3. **填寫科目資訊**：
   - 科目名稱：例如「數學」
   - 顏色：選擇一個顏色
   - 圖示：選擇一個表情符號

4. **點擊「保存」**

### 6.3 記錄成績

1. **點擊「評量記錄」標籤**

2. **點擊「添加評量」**

3. **填寫評量資訊**：
   - 標題：例如「第一次月考」
   - 評量類型：選擇「考試」
   - 科目：選擇剛才添加的科目
   - 滿分：例如「100」
   - 分數：例如「95」

4. **點擊「保存」**

5. **系統會自動計算獎金！** 💰

---

## ✅ 完成！

恭喜你！你已經成功設置了學生成績管理系統！

### 接下來可以做什麼？

- 📝 繼續添加更多學生和科目
- 💰 設定自訂的獎勵規則
- 📊 列印學習記錄報表
- 💾 備份你的資料

### 需要幫助？

- 📖 查看[功能說明](https://github.com/con2000us/Wilbur-s-rewardbook/wiki/功能說明)
- ❓ 查看[常見問題](https://github.com/con2000us/Wilbur-s-rewardbook/wiki/常見問題)
- 🐛 遇到問題？[回報問題](https://github.com/con2000us/Wilbur-s-rewardbook/issues)

---

## 🎉 享受使用！

希望這個系統能幫助你更好地管理學生成績！

*如果覺得有用，歡迎給我們一個 ⭐ Star！*

