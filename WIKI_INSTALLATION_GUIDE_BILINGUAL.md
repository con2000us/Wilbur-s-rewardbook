# 📖 Detailed Installation Guide / 詳細安裝指南

> **Designed for non-technical users, with detailed explanations for every step!**  
> **專為科技小白設計，每個步驟都有截圖和說明！**

## ⚠️ Important Notice / 重要聲明

### 🤖 AI-Generated Project / AI 生成專案

**This entire project, including all code, documentation, and this Wiki, was generated using AI (Cursor with AI-powered coding).**  
**整個專案，包括所有程式碼、文檔和這個 Wiki，都是使用 AI（Cursor AI 編碼）生成的。**

- The project is provided "as is" / 專案以「現狀」提供
- No guarantee of functionality or support / 不保證功能或支援
- Use at your own risk / 使用風險自負

---

## 🎯 Goal / 目標

After completing this guide, you will have:  
完成這個指南後，你將擁有一個：

- ✅ A completely free student progress management system / 完全免費的學生成績管理系統
- ✅ Can be used on any device (phone, tablet, computer) / 可以在任何裝置上使用（手機、平板、電腦）
- ✅ Password protected, data secure / 有密碼保護，資料安全
- ✅ Can backup and restore data anytime / 可以隨時備份和還原資料

## ⏱️ Estimated Time / 預計時間

- **Total time** / **總時間**：About 10-15 minutes / 約 10-15 分鐘
- **Account registration** / **註冊帳號**：5 minutes (3 accounts) / 5 分鐘（3 個帳號）
- **Database setup** / **設置資料庫**：3 minutes / 3 分鐘
- **Website deployment** / **部署網站**：3 minutes / 3 分鐘
- **Testing** / **測試使用**：2 minutes / 2 分鐘

## 📋 Preparation / 準備工作

Before starting, please prepare:  
在開始之前，請準備：

- ✅ A computer or phone with internet / 一台可以上網的電腦或手機
- ✅ An email address (for account registration) / 一個 Email 信箱（用來註冊帳號）
- ✅ 10-15 minutes of your time / 10-15 分鐘的時間
- ✅ A cup of coffee or tea (relax 😊) / 一杯咖啡或茶（放鬆心情 😊）

---

## Step 1: Register GitHub Account (2 minutes) / 步驟 1：註冊 GitHub 帳號（2 分鐘）

### Why do you need GitHub? / 為什麼需要 GitHub？
GitHub is where code is stored. We need it to deploy the website.  
GitHub 是用來存放程式碼的地方。我們需要它來部署網站。

### How to register? / 如何註冊？

1. **Open your browser** and go to: https://github.com/signup  
   **打開瀏覽器**，前往：https://github.com/signup

2. **Fill in registration information** / **填寫註冊資訊**：
   - Username / 用戶名：Choose a name you like / 選擇一個你喜歡的名字
   - Email / 電子郵件：Enter your email / 輸入你的 Email
   - Password / 密碼：Set a secure password / 設定一個安全的密碼
   - Check "I agree to the Terms of Service" / 勾選「I agree to the Terms of Service」

3. **Verify email** / **驗證 Email**：
   - Check your email inbox / 檢查你的 Email 信箱
   - Click the verification link sent by GitHub / 點擊 GitHub 發送的驗證連結

4. **Done!** ✅ / **完成！** ✅

> 💡 **Tip** / **小提示**：If you already have a GitHub account, you can skip this step.  
> 💡 **小提示**：如果已經有 GitHub 帳號，可以跳過這個步驟。

---

## Step 2: Register Vercel Account (1 minute) / 步驟 2：註冊 Vercel 帳號（1 分鐘）

### Why do you need Vercel? / 為什麼需要 Vercel？
Vercel is where the website is hosted. It makes your website accessible on the internet.  
Vercel 是用來託管（放置）網站的地方。它會讓你的網站可以在網路上被訪問。

### How to register? / 如何註冊？

1. **Go to**: https://vercel.com/signup  
   **前往**：https://vercel.com/signup

2. **Choose registration method** / **選擇註冊方式**：
   - Recommended: "Continue with GitHub" (sign in with GitHub account) / 建議選擇「Continue with GitHub」（用 GitHub 帳號登入）
   - This way you don't need to fill in information again / 這樣就不需要再填寫資料

3. **Authorize Vercel** / **授權 Vercel**：
   - Click "Authorize Vercel" / 點擊「Authorize Vercel」
   - Allow Vercel to access your GitHub account / 允許 Vercel 存取你的 GitHub 帳號

4. **Done!** ✅ / **完成！** ✅

> 💡 **Tip** / **小提示**：Using GitHub to sign in is the easiest since you already have a GitHub account.  
> 💡 **小提示**：使用 GitHub 登入最簡單，因為你已經有 GitHub 帳號了。

---

## Step 3: Register Supabase Account (2 minutes) / 步驟 3：註冊 Supabase 帳號（2 分鐘）

### Why do you need Supabase? / 為什麼需要 Supabase？
Supabase is where data is stored. All student grades and records are stored here.  
Supabase 是用來存放資料的地方。所有學生的成績、記錄都會存在這裡。

### How to register? / 如何註冊？

1. **Go to**: https://supabase.com  
   **前往**：https://supabase.com

2. **Click "Start your project"** or **"Sign up"**  
   **點擊「Start your project」**或**「Sign up」**

3. **Choose registration method** / **選擇註冊方式**：
   - Recommended: "Continue with GitHub" / 建議選擇「Continue with GitHub」
   - Or register with email / 或使用 Email 註冊

4. **Fill in organization information** / **填寫組織資訊**：
   - Organization Name / 組織名稱：Can be your name or tutoring center name / 可以填你的名字或補習班名稱
   - Choose a Region / 選擇一個地區：Choose the closest one (e.g., Southeast Asia) / 選擇離你最近的（例如：Southeast Asia）

5. **Done!** ✅ / **完成！** ✅

---

## Step 4: Set Up Supabase Database (3 minutes) / 步驟 4：設置 Supabase 資料庫（3 分鐘）

### 4.1 Create New Project / 創建新專案

1. **After logging into Supabase**, click **"New Project"**  
   **登入 Supabase**後，點擊**「New Project」**

2. **Fill in project information** / **填寫專案資訊**：
   - **Name** / **專案名稱**：e.g., `wilburs-rewardbook` or `我的成績系統` / 例如 `wilburs-rewardbook` 或 `我的成績系統`
   - **Database Password** / **資料庫密碼**：
     - Set a strong password (at least 12 characters) / 設定一個強密碼（至少 12 個字元）
     - ⚠️ **Important** / **重要**：Please remember this password! You might need it later / 請記下這個密碼！以後可能會用到
     - Recommendation: Save it in a password manager / 建議：使用密碼管理器保存
   - **Region** / **地區**：Choose the closest one / 選擇離你最近的

3. **Click "Create new project"**  
   **點擊「Create new project」**

4. **Wait 2-3 minutes**: Supabase is creating your database  
   **等待 2-3 分鐘**：Supabase 正在創建你的資料庫

### 4.2 Set Up Database Tables / 設置資料庫表格

1. **After project creation is complete**, click **"SQL Editor"** in the left menu  
   **等待專案創建完成**後，點擊左側選單的**「SQL Editor」**

2. **Click "New query"** / **點擊「New query」**（新建查詢）

3. **Open this file**: `setup-database.sql`  
   **打開這個檔案**：`setup-database.sql`
   - Find this file on the GitHub project page / 在 GitHub 專案頁面找到這個檔案
   - Click the file name / 點擊檔案名稱
   - Click the "Raw" button in the top right / 點擊右上角的「Raw」按鈕
   - Select all (Ctrl+A) and copy (Ctrl+C) all content / 全選（Ctrl+A）並複製（Ctrl+C）所有內容

4. **Paste into Supabase SQL Editor** / **貼上到 Supabase SQL Editor**：
   - Paste the copied content into the SQL Editor / 在 SQL Editor 中貼上剛才複製的內容
   - Click the **"Run"** button in the bottom right (or press Ctrl+Enter) / 點擊右下角的**「Run」**按鈕（或按 Ctrl+Enter）

5. **Confirm successful execution** / **確認執行成功**：
   - You should see "Success. No rows returned" or similar success message / 應該會看到「Success. No rows returned」或類似的成功訊息
   - If you see an error, check if you copied all content completely / 如果看到錯誤，請檢查是否完整複製了所有內容

### 4.3 Get API Keys / 取得 API 金鑰

1. **Click "Settings"** in the left menu / **點擊左側選單的「Settings」**（設定）

2. **Click "API"** / **點擊「API」**

3. **Copy the following two pieces of information** / **複製以下兩個資訊**：
   - **Project URL** / **專案網址**：
     - In the "Project URL" section / 在「Project URL」區塊中
     - Click the "Copy" button to copy / 點擊「Copy」按鈕複製
     - Example: `https://xxxxx.supabase.co`
   - **anon public key** / **公開金鑰**：
     - In the "Project API keys" section / 在「Project API keys」區塊中
     - Find the "anon public" row / 找到「anon public」這一列
     - Click the eye icon to show the password / 點擊眼睛圖示顯示密碼
     - Click the "Copy" button to copy / 點擊「Copy」按鈕複製
     - This is a very long string of text / 這是一串很長的文字

4. **Save these two pieces of information** / **保存這兩個資訊**：
   - Temporarily write them in Notepad or a document / 暫時記在記事本或文件中
   - You'll need them in the next step / 等一下部署時會用到

> 💡 **Tip** / **小提示**：These two pieces of information are important, but don't worry - you can always come back to check if you forget.  
> 💡 **小提示**：這兩個資訊很重要，但不用擔心，如果忘記了可以隨時回來查看。

---

## Step 5: Deploy to Vercel (3 minutes) / 步驟 5：部署到 Vercel（3 分鐘）

### 5.1 Start Deployment / 開始部署

1. **Go to the project GitHub page** / **前往專案 GitHub 頁面**：
   - https://github.com/con2000us/Wilbur-s-rewardbook
   - Or search for "Wilbur-s-rewardbook"

2. **Click the "Deploy with Vercel" button** / **點擊「Deploy with Vercel」按鈕**：
   - At the top of the README page / 在 README 頁面頂部
   - Or go directly to: https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook

3. **Sign in to Vercel** (if not already signed in) / **登入 Vercel**（如果還沒登入）

4. **Click "New Project"** / **點擊「New Project」**

### 5.2 Set Environment Variables / 設置環境變數

Before deploying, you need to set 3 environment variables:  
在部署之前，需要設置 3 個環境變數：

1. **Find the "Environment Variables" section** / **找到「Environment Variables」區塊**

2. **Add the first variable** / **添加第一個變數**：
   - **Name** / **名稱**：`NEXT_PUBLIC_SUPABASE_URL`
   - **Value** / **值**：Paste the "Project URL" you copied from Supabase / 貼上剛才從 Supabase 複製的「Project URL」
   - Click **"Add"** / 點擊「Add」

3. **Add the second variable** / **添加第二個變數**：
   - **Name** / **名稱**：`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value** / **值**：Paste the "anon public key" you copied from Supabase / 貼上剛才從 Supabase 複製的「anon public key」
   - Click **"Add"** / 點擊「Add」

4. **Add the third variable** (Password protection) / **添加第三個變數**（密碼保護）：
   - **Name** / **名稱**：`SITE_PASSWORD`
   - **Value** / **值**：Set a strong password (e.g., `MyStr0ng!P@ssw0rd2024`) / 設定一個強密碼（例如：`MyStr0ng!P@ssw0rd2024`）
   - ⚠️ **Important** / **重要**：Please remember this password! This is the password to log into the website / 請記下這個密碼！這是用來登入網站的密碼
   - Click **"Add"** / 點擊「Add」

### 5.3 Start Deployment / 開始部署

1. **Confirm all environment variables are added** / **確認所有環境變數都已添加**

2. **Click the "Deploy" button** / **點擊「Deploy」按鈕**

3. **Wait 2-3 minutes** / **等待 2-3 分鐘**：
   - You can see the deployment progress / 可以看到部署進度
   - Wait for "Building" and "Deploying" to complete / 等待「Building」和「Deploying」完成

4. **Deployment complete!** ✅ / **部署完成！** ✅
   - You'll see a "Congratulations!" message / 會看到「Congratulations!」訊息
   - Your website URL will be displayed (e.g., `https://your-project.vercel.app`) / 會顯示你的網站網址（例如：`https://your-project.vercel.app`）

### 5.4 Test the Website / 測試網站

1. **Click the "Visit" button** or copy the website URL  
   **點擊「Visit」按鈕**或複製網站網址

2. **You should see a login page** / **應該會看到登入頁面**：
   - Enter the `SITE_PASSWORD` you set earlier / 輸入剛才設定的 `SITE_PASSWORD`
   - Click "登入" (Login) / 點擊「登入」

3. **Successfully entered the website!** 🎉 / **成功進入網站！** 🎉

---

## Step 6: Start Using (2 minutes) / 步驟 6：開始使用（2 分鐘）

### 6.1 Add Your First Student / 添加第一個學生

1. **Click the "Add Student" button** / **點擊「添加學生」按鈕**

2. **Fill in student information** / **填寫學生資訊**：
   - Name / 姓名：e.g., "Xiao Ming" / 例如「小明」
   - Email (optional) / Email（可選）：Can leave blank / 可以留空
   - Avatar / 頭像：Choose an emoji / 選擇一個表情符號
   - Background color / 背景顏色：Choose a color / 選擇一個顏色

3. **Click "Save"** / **點擊「保存」**

### 6.2 Add Subject / 添加科目

1. **Click the student's "Subjects" tab** / **點擊學生的「科目」標籤**

2. **Click "Add Subject"** / **點擊「添加科目」**

3. **Fill in subject information** / **填寫科目資訊**：
   - Subject name / 科目名稱：e.g., "Math" / 例如「數學」
   - Color / 顏色：Choose a color / 選擇一個顏色
   - Icon / 圖示：Choose an emoji / 選擇一個表情符號

4. **Click "Save"** / **點擊「保存」**

### 6.3 Record Grades / 記錄成績

1. **Click the "Assessment Records" tab** / **點擊「評量記錄」標籤**

2. **Click "Add Assessment"** / **點擊「添加評量」**

3. **Fill in assessment information** / **填寫評量資訊**：
   - Title / 標題：e.g., "First Monthly Exam" / 例如「第一次月考」
   - Assessment type / 評量類型：Select "Exam" / 選擇「考試」
   - Subject / 科目：Select the subject you just added / 選擇剛才添加的科目
   - Max score / 滿分：e.g., "100" / 例如「100」
   - Score / 分數：e.g., "95" / 例如「95」

4. **Click "Save"** / **點擊「保存」**

5. **The system will automatically calculate rewards!** 💰 / **系統會自動計算獎金！** 💰

---

## ✅ Complete! / 完成！

Congratulations! You have successfully set up the student progress management system!  
恭喜你！你已經成功設置了學生成績管理系統！

### What's Next? / 接下來可以做什麼？

- 📝 Continue adding more students and subjects / 繼續添加更多學生和科目
- 💰 Set up custom reward rules / 設定自訂的獎勵規則
- 📊 Print learning record reports / 列印學習記錄報表
- 💾 Backup your data / 備份你的資料

### Need Help? / 需要幫助？

- 📖 See [Feature Guide / 功能說明](https://github.com/con2000us/Wilbur-s-rewardbook/wiki/功能說明-Features)
- ❓ See [FAQ / 常見問題](https://github.com/con2000us/Wilbur-s-rewardbook/wiki/常見問題-FAQ)
- 🐛 Having issues? [Report Issues / 回報問題](https://github.com/con2000us/Wilbur-s-rewardbook/issues)

---

## ⚠️ Important Notices / 重要提醒

### 💾 Data Backup & Disclaimer / 資料備份與免責聲明

**This website provides data backup functionality. We strongly recommend regular backups.**  
**本網站提供資料備份功能。我們強烈建議定期備份。**

**⚠️ Important / 重要**：
- This project makes **NO commitment** regarding data preservation or loss / 本專案**不對**使用者的任何資料保存與遺失做任何承諾
- Users are responsible for their own data backup / 使用者需自行負責資料備份
- The project developers are not liable for any data loss / 專案開發者不對任何資料遺失負責
- Always maintain your own backups / 請務必自行維護備份

**Recommendation / 建議**：
- ✅ Backup your data regularly (weekly or monthly) / 定期備份資料（每週或每月）
- ✅ Use the built-in backup feature / 使用內建的備份功能
- ✅ Download and save backup files locally / 下載並在本地保存備份檔案
- ✅ Test backup restoration periodically / 定期測試備份還原

## 🎉 Enjoy Using! / 享受使用！

Hope this system helps you better manage student grades!  
希望這個系統能幫助你更好地管理學生成績！

*If you find it useful, please give us a ⭐ Star!*  
*如果覺得有用，歡迎給我們一個 ⭐ Star！*

