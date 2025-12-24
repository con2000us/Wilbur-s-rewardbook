# 🔒 密碼保護設置指南 / Password Protection Setup Guide

## 📋 概述 / Overview

此應用程式已實作簡單的密碼保護功能，無需 Vercel Pro 方案即可使用。

This application has implemented simple password protection that works without Vercel Pro plan.

## ⚙️ 設置步驟 / Setup Steps

### 1. 設置環境變量 / Set Environment Variables

#### 本地開發 / Local Development

在項目根目錄創建 `.env.local` 文件：

Create `.env.local` file in project root:

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 網站密碼保護（必填）
SITE_PASSWORD=your-strong-password-here
```

#### Vercel 部署 / Vercel Deployment

1. 登入 Vercel Dashboard
2. 選擇你的專案
3. 進入 **Settings** → **Environment Variables**
4. 添加以下環境變量：

```
SITE_PASSWORD=your-strong-password-here
```

**重要提示 / Important Notes:**
- ⚠️ 如果未設置 `SITE_PASSWORD`，系統將使用預設密碼 `password`（僅用於開發測試）
- ⚠️ 生產環境務必設置強密碼
- ✅ 密碼會存儲在環境變量中，不會暴露給客戶端

## 🔐 密碼要求 / Password Requirements

建議使用強密碼：

- 至少 12 個字符
- 包含大小寫字母、數字和符號
- 不要使用常見單詞或個人信息

Example: `MyStr0ng!P@ssw0rd2024`

## 🚀 功能說明 / Features

### 已實作功能 / Implemented Features

- ✅ 登入頁面（`/login`）
- ✅ 密碼驗證
- ✅ 自動重定向（登入後返回原頁面）
- ✅ 登出功能
- ✅ Cookie 認證（30 天有效）
- ✅ 保護所有頁面（除登入頁和公開資源）

### 使用方式 / How to Use

1. **首次訪問**：訪問任何頁面都會自動重定向到登入頁
2. **輸入密碼**：在登入頁輸入正確的密碼
3. **自動登入**：登入成功後會自動返回原頁面
4. **登出**：點擊右上角的「登出」按鈕

## 🔧 技術細節 / Technical Details

### 認證機制 / Authentication Mechanism

- 使用 HTTP-only Cookie 存儲認證狀態
- Cookie 有效期：30 天
- 在 middleware 中檢查認證狀態
- 未認證用戶自動重定向到登入頁

### 安全特性 / Security Features

- ✅ HTTP-only Cookie（防止 XSS 攻擊）
- ✅ Secure Flag（生產環境啟用 HTTPS）
- ✅ SameSite=Lax（防止 CSRF 攻擊）
- ✅ 密碼存儲在服務端環境變量

## 📝 文件結構 / File Structure

```
app/
├── login/
│   └── page.tsx          # 登入頁面
├── api/
│   └── auth/
│       ├── login/
│       │   └── route.ts   # 登入 API
│       └── logout/
│           └── route.ts  # 登出 API
└── components/
    └── LogoutButton.tsx  # 登出按鈕組件

middleware.ts              # 認證中間件
```

## 🐛 故障排除 / Troubleshooting

### 問題：無法登入 / Cannot Login

**解決方案：**
1. 檢查環境變量 `SITE_PASSWORD` 是否正確設置
2. 確認密碼沒有多餘空格
3. 檢查瀏覽器控制台是否有錯誤
4. 清除瀏覽器 Cookie 後重試

### 問題：登入後仍被重定向 / Still Redirected After Login

**解決方案：**
1. 檢查 Cookie 是否正確設置
2. 確認 middleware 配置正確
3. 檢查瀏覽器是否阻止 Cookie
4. 嘗試清除瀏覽器緩存

### 問題：忘記密碼 / Forgot Password

**解決方案：**
1. 在 Vercel Dashboard 中更新 `SITE_PASSWORD` 環境變量
2. 重新部署應用程式
3. 清除瀏覽器 Cookie 後使用新密碼登入

## ⚠️ 安全建議 / Security Recommendations

1. **使用強密碼**：至少 12 個字符，包含大小寫、數字和符號
2. **定期更改密碼**：建議每 3-6 個月更改一次
3. **不要分享密碼**：僅與信任的人分享
4. **使用 HTTPS**：Vercel 自動提供 HTTPS，確保生產環境使用
5. **保護環境變量**：不要在代碼中硬編碼密碼

## 📊 與其他方案對比 / Comparison

| 功能 | 自定義密碼保護 | Vercel 密碼保護 | 完整認證 |
|------|--------------|----------------|----------|
| **成本** | 免費 | $20/月 | 免費 |
| **設置複雜度** | 簡單 | 非常簡單 | 複雜 |
| **自定義 UI** | ✅ 是 | ❌ 否 | ✅ 是 |
| **多用戶** | ❌ 否 | ❌ 否 | ✅ 是 |
| **適合** | 個人/家庭 | 個人/家庭 | 生產環境 |

## 🎯 適用場景 / Use Cases

### 適合使用自定義密碼保護的情況：

- ✅ 個人或家庭使用
- ✅ 不需要多用戶管理
- ✅ 想要免費解決方案
- ✅ 需要自定義登入頁面
- ✅ 簡單的訪問控制需求

### 不適合的情況：

- ❌ 需要多用戶系統
- ❌ 需要細粒度權限控制
- ❌ 需要審計日誌
- ❌ 面向公眾的生產應用

## 📚 相關文檔 / Related Documentation

- [SECURITY_WARNING.md](./SECURITY_WARNING.md) - 安全警告
- [VERCEL_PASSWORD_PROTECTION.md](./VERCEL_PASSWORD_PROTECTION.md) - Vercel 密碼保護說明
- [AUTHENTICATION_IMPLEMENTATION.md](./AUTHENTICATION_IMPLEMENTATION.md) - 完整認證實作指南

## 🆘 需要幫助？/ Need Help?

如果遇到問題：
1. 檢查環境變量設置
2. 查看瀏覽器控制台錯誤
3. 檢查 Vercel 部署日誌
4. 參考故障排除章節

---

**狀態：** ✅ **已實作並可用** / ✅ **Implemented and Ready**

