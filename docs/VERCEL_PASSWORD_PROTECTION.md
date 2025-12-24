# 🔒 Vercel Password Protection Guide / Vercel 密碼保護指南

## 📋 What is Vercel Password Protection? / 什麼是 Vercel 密碼保護？

Vercel's password protection is a **deployment-level** feature that adds a basic authentication layer to your entire application. It's different from application-level authentication.

Vercel 的密碼保護是一個**部署層級**的功能，為整個應用程式添加基本的身份驗證層。它與應用程式層級的身份驗證不同。

## ⚠️ Important Note / 重要說明

**Vercel Password Protection is only available for:**
- ✅ **Production deployments** (main branch)
- ✅ **Vercel Pro/Enterprise plans** (paid plans)
- ❌ **NOT available on free tier**
- ❌ **NOT available for Preview deployments**

**Vercel 密碼保護僅適用於：**
- ✅ **生產環境部署**（main 分支）
- ✅ **Vercel Pro/Enterprise 方案**（付費方案）
- ❌ **免費方案不提供此功能**
- ❌ **預覽部署不提供此功能**

## 🎯 How It Works / 工作原理

When enabled, Vercel adds a **Basic Authentication** popup before users can access your site:

啟用後，Vercel 會在用戶訪問網站前顯示**基本身份驗證**彈窗：

```
┌─────────────────────────────────┐
│  Authentication Required         │
│  ─────────────────────────────   │
│  Username: [___________]         │
│  Password: [___________]         │
│                                  │
│  [ Cancel ]  [  Sign In  ]       │
└─────────────────────────────────┘
```

## ✅ Advantages / 優點

### 1. **Simple Setup / 設置簡單**
- ✅ No code changes required / 無需修改代碼
- ✅ Configure in Vercel dashboard / 在 Vercel 儀表板中配置
- ✅ Works immediately after deployment / 部署後立即生效

### 2. **Protects Entire Site / 保護整個網站**
- ✅ All pages are protected / 所有頁面都受保護
- ✅ API routes are protected / API 路由也受保護
- ✅ No need to modify application code / 無需修改應用程式代碼

### 3. **Easy to Manage / 易於管理**
- ✅ Single password for all users / 所有用戶使用同一個密碼
- ✅ Can be changed anytime / 可以隨時更改
- ✅ No database changes needed / 無需更改數據庫

### 4. **Good for Personal Use / 適合個人使用**
- ✅ Perfect for family/personal projects / 適合家庭/個人專案
- ✅ Quick solution for private deployments / 私有部署的快速解決方案
- ✅ No additional infrastructure / 無需額外基礎設施

## ❌ Disadvantages / 缺點

### 1. **Not Available on Free Tier / 免費方案不可用**
- ❌ Requires Vercel Pro ($20/month) or Enterprise plan
- ❌ Free tier users cannot use this feature
- ❌ 需要 Vercel Pro（每月 $20）或 Enterprise 方案
- ❌ 免費方案用戶無法使用此功能

### 2. **Limited Security / 安全性有限**
- ❌ Basic Authentication only (not encrypted by default)
- ❌ Single password shared by all users
- ❌ No user management (can't track who accessed what)
- ❌ Vulnerable to brute force attacks if password is weak
- ❌ 僅基本身份驗證（預設不加密）
- ❌ 所有用戶共享同一個密碼
- ❌ 沒有用戶管理（無法追蹤誰訪問了什麼）
- ❌ 如果密碼太弱，容易受到暴力破解攻擊

### 3. **No Granular Control / 沒有細粒度控制**
- ❌ Cannot set different permissions for different users
- ❌ Cannot restrict access to specific pages
- ❌ All users have the same access level
- ❌ 無法為不同用戶設置不同權限
- ❌ 無法限制對特定頁面的訪問
- ❌ 所有用戶具有相同的訪問級別

### 4. **User Experience / 用戶體驗**
- ❌ Browser popup (not a custom login page)
- ❌ Cannot customize the login UI
- ❌ Users need to enter password every time (unless browser saves it)
- ❌ 瀏覽器彈窗（不是自定義登入頁面）
- ❌ 無法自定義登入 UI
- ❌ 用戶每次都需要輸入密碼（除非瀏覽器保存）

### 5. **Not Suitable for Production / 不適合生產環境**
- ❌ Not recommended for public-facing applications
- ❌ Not suitable for multi-user systems
- ❌ No audit logs or access tracking
- ❌ 不建議用於面向公眾的應用程式
- ❌ 不適合多用戶系統
- ❌ 沒有審計日誌或訪問追蹤

## 🛠️ How to Enable / 如何啟用

### Step 1: Upgrade to Vercel Pro / 步驟 1：升級到 Vercel Pro

1. Go to [vercel.com](https://vercel.com)
2. Navigate to your project
3. Go to **Settings** → **Deployment Protection**
4. Upgrade to **Pro** plan ($20/month)

### Step 2: Enable Password Protection / 步驟 2：啟用密碼保護

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Deployment Protection**
3. Enable **"Password Protection"**
4. Set a username and password
5. Save changes
6. Redeploy your application

### Step 3: Test / 步驟 3：測試

1. Visit your Vercel URL
2. You should see a browser authentication popup
3. Enter the username and password
4. You'll be able to access the site

## 💡 Alternative: Custom Password Protection / 替代方案：自定義密碼保護

Since Vercel's password protection requires a paid plan, here's a **free alternative** you can implement in your code:

由於 Vercel 的密碼保護需要付費方案，這裡有一個**免費的替代方案**，你可以在代碼中實現：

### Option A: Simple Password Middleware / 選項 A：簡單密碼中間件

Create a middleware that checks for a password:

創建一個檢查密碼的中間件：

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if user is authenticated
  const isAuthenticated = request.cookies.get('site-auth')?.value === 'true'
  
  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}
```

### Option B: Environment Variable Password / 選項 B：環境變量密碼

Use an environment variable for password:

使用環境變量作為密碼：

```typescript
// app/login/page.tsx
const SITE_PASSWORD = process.env.SITE_PASSWORD || 'default-password'

// Check password on login page
// Store authentication in cookie/session
```

## 📊 Comparison Table / 對比表

| Feature / 功能 | Vercel Password Protection | Custom Password | Full Authentication |
|---------------|---------------------------|-----------------|---------------------|
| **Cost / 成本** | $20/month | Free | Free (with Supabase) |
| **Setup Complexity / 設置複雜度** | Easy / 簡單 | Medium / 中等 | Complex / 複雜 |
| **Security Level / 安全級別** | Basic / 基本 | Basic / 基本 | High / 高 |
| **User Management / 用戶管理** | No / 無 | No / 無 | Yes / 有 |
| **Access Control / 訪問控制** | All or nothing / 全部或無 | All or nothing / 全部或無 | Granular / 細粒度 |
| **Suitable For / 適合** | Personal use / 個人使用 | Personal use / 個人使用 | Production / 生產環境 |

## 🎯 Recommendation / 建議

### Use Vercel Password Protection if:
- ✅ You have Vercel Pro plan
- ✅ You want the simplest solution
- ✅ It's for personal/family use only
- ✅ You don't need user management

### Use Custom Password if:
- ✅ You're on Vercel free tier
- ✅ You want a free solution
- ✅ You're comfortable with code changes
- ✅ It's for personal use

### Use Full Authentication if:
- ✅ You need multiple users
- ✅ You need access control
- ✅ You need audit logs
- ✅ It's for production use

## 🔐 Security Best Practices / 安全最佳實踐

If you use password protection (Vercel or custom):

1. **Use a Strong Password / 使用強密碼**
   - At least 12 characters / 至少 12 個字符
   - Mix of letters, numbers, symbols / 混合字母、數字、符號
   - Don't use common words / 不要使用常見單詞

2. **Use HTTPS / 使用 HTTPS**
   - Vercel automatically provides HTTPS / Vercel 自動提供 HTTPS
   - Never use password protection over HTTP / 永遠不要在 HTTP 上使用密碼保護

3. **Change Password Regularly / 定期更改密碼**
   - Change it every 3-6 months / 每 3-6 個月更改一次
   - If you suspect it's compromised / 如果懷疑被洩露

4. **Don't Share URL Publicly / 不要公開分享網址**
   - Even with password protection, keep URL private / 即使有密碼保護，也要保持網址私有
   - Only share with trusted users / 只與信任的用戶分享

## 📝 Summary / 總結

**Vercel Password Protection:**
- ✅ Simple and easy / 簡單易用
- ❌ Requires paid plan / 需要付費方案
- ✅ Good for personal use / 適合個人使用
- ❌ Limited security features / 安全功能有限

**For free tier users, consider implementing custom password protection in your application code.**

**對於免費方案用戶，考慮在應用程式代碼中實現自定義密碼保護。**

