# 📚 GitHub Wiki 設置指南 / GitHub Wiki Setup Guide

> **如何將 Wiki 內容設置到 GitHub Wiki 頁面**  
> **How to set up Wiki content on GitHub Wiki pages**

## 🎯 概述 / Overview

GitHub Wiki 是一個獨立的文檔系統，需要手動在 GitHub 網站上創建頁面。  
GitHub Wiki is a separate documentation system that requires manually creating pages on the GitHub website.

有兩種方式可以設置：  
There are two ways to set it up:

1. **通過 GitHub 網頁界面**（推薦給初學者）/ **Via GitHub Web Interface** (Recommended for beginners)
2. **通過 Git 克隆 Wiki 倉庫**（適合進階用戶）/ **Via Git Clone Wiki Repository** (For advanced users)

---

## 方法 1：通過 GitHub 網頁界面 / Method 1: Via GitHub Web Interface

### 步驟 1：啟用 Wiki / Step 1: Enable Wiki

1. **前往你的 GitHub 專案頁面** / **Go to your GitHub project page**
   - https://github.com/con2000us/Wilbur-s-rewardbook

2. **點擊右側的「Wiki」標籤** / **Click the "Wiki" tab on the right**
   - 如果還沒有啟用，會看到「Create the first page」按鈕
   - If not enabled yet, you'll see a "Create the first page" button

3. **點擊「Create the first page」** / **Click "Create the first page"**

### 步驟 2：創建首頁 / Step 2: Create Home Page

1. **頁面標題** / **Page Title**：輸入 `Home` 或 `首頁`

2. **頁面內容** / **Page Content**：
   - 打開專案中的 `WIKI_HOME.md` 文件
   - Open the `WIKI_HOME.md` file in the project
   - 複製所有內容（Ctrl+A, Ctrl+C）
   - Copy all content (Ctrl+A, Ctrl+C)
   - 貼上到 GitHub Wiki 編輯器中
   - Paste into the GitHub Wiki editor

3. **點擊「Save Page」** / **Click "Save Page"**

### 步驟 3：創建其他頁面 / Step 3: Create Other Pages

重複以下步驟創建其他頁面：  
Repeat the following steps to create other pages:

#### 3.1 詳細安裝指南 / Detailed Installation Guide

1. **點擊「New Page」** / **Click "New Page"**
2. **頁面標題** / **Page Title**：`詳細安裝指南-Detailed-Installation-Guide`
3. **頁面內容** / **Page Content**：
   - 打開 `WIKI_INSTALLATION_GUIDE_BILINGUAL.md`
   - 複製所有內容並貼上
4. **點擊「Save Page」** / **Click "Save Page"**

#### 3.2 常見問題 / FAQ

1. **點擊「New Page」** / **Click "New Page"**
2. **頁面標題** / **Page Title**：`常見問題-FAQ`
3. **頁面內容** / **Page Content**：
   - 打開 `WIKI_FAQ_BILINGUAL.md`
   - 複製所有內容並貼上
4. **點擊「Save Page」** / **Click "Save Page"**

### 步驟 4：設置側邊欄 / Step 4: Set Up Sidebar

1. **點擊「Edit」按鈕**（在 Wiki 頁面右上角）/ **Click "Edit" button** (top right of Wiki page)

2. **創建或編輯 `_Sidebar.md`** / **Create or edit `_Sidebar.md`**：

```markdown
# Navigation / 導航

## Main Pages / 主要頁面

- [[Home|首頁]] - Welcome page / 歡迎頁面
- [[詳細安裝指南-Detailed-Installation-Guide|詳細安裝指南]] - Installation guide / 安裝指南
- [[常見問題-FAQ|常見問題]] - Frequently Asked Questions / 常見問題

## Quick Links / 快速連結

- [GitHub Repository / 專案倉庫](https://github.com/con2000us/Wilbur-s-rewardbook)
- [Report Issues / 回報問題](https://github.com/con2000us/Wilbur-s-rewardbook/issues)
```

3. **點擊「Save Page」** / **Click "Save Page"**

### 步驟 5：設置頁腳 / Step 5: Set Up Footer

1. **點擊「New Page」** / **Click "New Page"**
2. **頁面標題** / **Page Title**：`_Footer`
3. **頁面內容** / **Page Content**：

```markdown
---

**Made with ❤️ using AI (Cursor)**  
**使用 AI (Cursor) 製作 ❤️**

[GitHub Repository](https://github.com/con2000us/Wilbur-s-rewardbook) | [Report Issues](https://github.com/con2000us/Wilbur-s-rewardbook/issues)
```

4. **點擊「Save Page」** / **Click "Save Page"**

---

## 方法 2：通過 Git 克隆 Wiki 倉庫 / Method 2: Via Git Clone Wiki Repository

### 步驟 1：克隆 Wiki 倉庫 / Step 1: Clone Wiki Repository

```bash
# 克隆 Wiki 倉庫
# Clone Wiki repository
git clone https://github.com/con2000us/Wilbur-s-rewardbook.wiki.git

# 進入 Wiki 目錄
# Enter Wiki directory
cd Wilbur-s-rewardbook.wiki
```

### 步驟 2：複製文件 / Step 2: Copy Files

```bash
# 從專案目錄複製 Wiki 文件
# Copy Wiki files from project directory
cp ../wilburs-rewardbook/WIKI_HOME.md Home.md
cp ../wilburs-rewardbook/WIKI_INSTALLATION_GUIDE_BILINGUAL.md "詳細安裝指南-Detailed-Installation-Guide.md"
cp ../wilburs-rewardbook/WIKI_FAQ_BILINGUAL.md "常見問題-FAQ.md"
```

### 步驟 3：創建側邊欄 / Step 3: Create Sidebar

創建 `_Sidebar.md` 文件：

```markdown
# Navigation / 導航

## Main Pages / 主要頁面

- [[Home|首頁]] - Welcome page / 歡迎頁面
- [[詳細安裝指南-Detailed-Installation-Guide|詳細安裝指南]] - Installation guide / 安裝指南
- [[常見問題-FAQ|常見問題]] - Frequently Asked Questions / 常見問題
```

### 步驟 4：提交並推送 / Step 4: Commit and Push

```bash
# 添加所有文件
# Add all files
git add .

# 提交更改
# Commit changes
git commit -m "Add Wiki pages: Home, Installation Guide, FAQ"

# 推送到 GitHub
# Push to GitHub
git push origin master
```

---

## 📋 頁面列表 / Page List

以下是需要創建的 Wiki 頁面：  
Here are the Wiki pages you need to create:

| 頁面標題 / Page Title | 對應文件 / Corresponding File | 說明 / Description |
|---------------------|------------------------------|-------------------|
| `Home` | `WIKI_HOME.md` | 首頁 / Welcome page |
| `詳細安裝指南-Detailed-Installation-Guide` | `WIKI_INSTALLATION_GUIDE_BILINGUAL.md` | 安裝指南 / Installation guide |
| `常見問題-FAQ` | `WIKI_FAQ_BILINGUAL.md` | 常見問題 / FAQ |
| `_Sidebar` | 手動創建 / Manual creation | 側邊欄導航 / Sidebar navigation |
| `_Footer` | 手動創建 / Manual creation | 頁腳 / Footer |

---

## 🔗 頁面連結格式 / Page Link Format

在 GitHub Wiki 中，頁面連結的格式是：  
In GitHub Wiki, page links use this format:

```markdown
[[Page Title|顯示文字]]
```

例如：  
For example:

```markdown
[[Home|首頁]]
[[詳細安裝指南-Detailed-Installation-Guide|詳細安裝指南]]
[[常見問題-FAQ|常見問題]]
```

---

## 💡 提示 / Tips

### 1. 頁面標題 / Page Titles
- 可以使用中文或英文 / Can use Chinese or English
- 建議使用描述性的標題 / Recommend using descriptive titles
- 避免使用特殊字符 / Avoid special characters

### 2. 內容更新 / Content Updates
- 如果更新了專案中的 `WIKI_*.md` 文件，需要手動更新 GitHub Wiki
- If you update `WIKI_*.md` files in the project, you need to manually update GitHub Wiki
- 或者使用 Git 方法自動同步 / Or use Git method to auto-sync

### 3. 圖片 / Images
- 可以上傳圖片到 Wiki 頁面
- Can upload images to Wiki pages
- 圖片會自動存儲在 Wiki 倉庫中
- Images are automatically stored in Wiki repository

### 4. 版本控制 / Version Control
- GitHub Wiki 有完整的版本歷史
- GitHub Wiki has complete version history
- 可以查看和恢復舊版本
- Can view and restore old versions

---

## 🎯 快速設置清單 / Quick Setup Checklist

- [ ] 啟用 GitHub Wiki / Enable GitHub Wiki
- [ ] 創建首頁（使用 `WIKI_HOME.md`）/ Create Home page (using `WIKI_HOME.md`)
- [ ] 創建安裝指南頁面（使用 `WIKI_INSTALLATION_GUIDE_BILINGUAL.md`）/ Create Installation Guide page
- [ ] 創建 FAQ 頁面（使用 `WIKI_FAQ_BILINGUAL.md`）/ Create FAQ page
- [ ] 創建側邊欄（`_Sidebar.md`）/ Create Sidebar (`_Sidebar.md`)
- [ ] 創建頁腳（`_Footer`）/ Create Footer (`_Footer`)
- [ ] 測試所有連結 / Test all links
- [ ] 檢查格式是否正確 / Check if formatting is correct

---

## 🆘 需要幫助？/ Need Help?

如果遇到問題：  
If you encounter issues:

1. **查看 GitHub 文檔** / **Check GitHub Documentation**
   - [GitHub Wiki Guide](https://docs.github.com/en/communities/documenting-your-project-with-wikis)

2. **檢查頁面標題** / **Check Page Titles**
   - 確保頁面標題與連結中的名稱一致
   - Make sure page titles match the names in links

3. **檢查格式** / **Check Formatting**
   - GitHub Wiki 使用標準 Markdown
   - GitHub Wiki uses standard Markdown
   - 確保複製的內容格式正確
   - Make sure copied content is properly formatted

---

**完成設置後，你的 GitHub Wiki 就可以使用了！** 🎉  
**After completing the setup, your GitHub Wiki will be ready to use!** 🎉

