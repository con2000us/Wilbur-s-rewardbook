# Quick Deploy Guide / 快速部署指南

## 🎯 What You Need / 你需要什麼

To deploy this project, you need **3 free accounts** (all take less than 2 minutes to create):

要部署此專案，你需要 **3 個免費帳號**（每個帳號註冊時間少於 2 分鐘）：

1. ✅ **GitHub Account** (Free)
   - Why needed: Vercel needs to clone your code from GitHub
   - Sign up: [github.com/signup](https://github.com/signup)
   - 為什麼需要：Vercel 需要從 GitHub 克隆你的代碼
   - 註冊：[github.com/signup](https://github.com/signup)

2. ✅ **Vercel Account** (Free)
   - Why needed: To host and deploy your application
   - Sign up: [vercel.com/signup](https://vercel.com/signup)
   - You can sign in with your GitHub account (recommended)
   - 為什麼需要：用於託管和部署你的應用程式
   - 註冊：[vercel.com/signup](https://vercel.com/signup)
   - 可以使用 GitHub 帳號登入（推薦）

3. ✅ **Supabase Account** (Free)
   - Why needed: For the database (where all your data is stored)
   - Sign up: [supabase.com](https://supabase.com)
   - 為什麼需要：用於資料庫（存儲所有數據的地方）
   - 註冊：[supabase.com](https://supabase.com)

## ⚡ Why GitHub is Required / 為什麼需要 GitHub

**GitHub is required because:**
- Vercel needs to access your code to deploy it
- Vercel automatically creates a Git repository to track your deployments
- Every code change can trigger automatic redeployment

**需要 GitHub 的原因：**
- Vercel 需要訪問你的代碼來部署
- Vercel 會自動創建 Git 倉庫來追蹤你的部署
- 每次代碼更改都會觸發自動重新部署

**Good news:** GitHub is free and you can use it just for deployment (you don't need to know Git!)

**好消息：** GitHub 是免費的，你只需要用它來部署（不需要了解 Git！）

## 🚀 Deployment Steps / 部署步驟

### Step 1: Create Accounts (5 minutes) / 步驟 1：創建帳號（5 分鐘）

1. Create GitHub account → [github.com/signup](https://github.com/signup)
2. Create Vercel account → [vercel.com/signup](https://vercel.com/signup) (use GitHub to sign in)
3. Create Supabase account → [supabase.com](https://supabase.com)

### Step 2: Set Up Database (5 minutes) / 步驟 2：設置資料庫（5 分鐘）

1. In Supabase, create a new project
2. Go to SQL Editor
3. Copy and paste `setup-database.sql`
4. Click Run
5. Go to Settings → API
6. Copy your **Project URL** and **anon public key**

### Step 3: Deploy (3 minutes) / 步驟 3：部署（3 分鐘）

1. Click the **"Deploy with Vercel"** button in README
2. Sign in with GitHub
3. When asked for "Private Repository Name", enter: `wilburs-rewardbook`
4. Click "Create"
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon public key
6. Click "Deploy"
7. Wait 2-3 minutes
8. Done! 🎉

## 💡 Alternative: No GitHub? / 替代方案：沒有 GitHub？

If you don't want to use GitHub, you can:

如果你不想使用 GitHub，你可以：

1. **Deploy manually** (more complex):
   - Download the code as ZIP
   - Upload to a hosting service that supports direct upload
   - But you'll lose automatic deployments

2. **Use other platforms** that don't require GitHub:
   - Some platforms allow direct code upload
   - But they're usually more expensive or have limitations

**Recommendation:** GitHub is free, easy to set up, and enables automatic deployments. It's worth creating an account!

**建議：** GitHub 是免費的，設置簡單，並且能啟用自動部署。值得創建一個帳號！

## ❓ FAQ / 常見問題

### Q: Do I need to know how to code?
**A:** No! Just follow the steps above. No coding knowledge required.

### Q: Is everything really free?
**A:** Yes! All three services offer generous free tiers:
- GitHub: Unlimited public repositories
- Vercel: Unlimited deployments, 100GB bandwidth
- Supabase: 500MB database, 2GB bandwidth

### Q: Can I deploy without GitHub?
**A:** Technically yes, but it's much more complicated. GitHub makes deployment automatic and easy.

### Q: What if I already have a GitHub account?
**A:** Perfect! Just use your existing account. No need to create a new one.

---

**Ready to deploy?** Click the "Deploy with Vercel" button in the main README! 🚀

