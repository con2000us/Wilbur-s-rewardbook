# Deployment Guide / 部署指南

Complete step-by-step guide for deploying Wilbur's Reward Book.

## 🎯 Quick Start (5 minutes)

### Option 1: One-Click Deploy (Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook)

1. Click the button above
2. Sign in with GitHub
3. Add environment variables (see below)
4. Deploy!

### Option 2: Use as Template

1. Click **"Use this template"** button on GitHub
2. Create your own repository
3. Follow the deployment steps below

## 📋 Prerequisites

You need **3 free accounts** to deploy this project:

- [ ] **GitHub account** (free) - [Sign up here](https://github.com/signup)
  - *Required because Vercel needs to clone the code from GitHub*
- [ ] **Vercel account** (free) - [Sign up here](https://vercel.com/signup)
  - *You can sign up with your GitHub account*
- [ ] **Supabase account** (free) - [Sign up here](https://supabase.com)
  - *For the database*
- [ ] 10 minutes of your time

**All accounts are 100% free** and take less than 2 minutes each to create!

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `wilburs-rewardbook` (or any name you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

### 1.2 Run Database Setup

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `setup-database.sql` from this repository
4. Copy the **entire content** and paste into the SQL Editor
5. Click **"Run"** (or press `Ctrl+Enter`)
6. You should see: `✅ Database setup completed successfully!`

### 1.3 Get API Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys" → "anon public")

You'll need these in the next step!

## 🚀 Step 2: Deploy to Vercel

### 2.1 Deploy via Button

1. Click the **"Deploy with Vercel"** button at the top of this README
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Select your repository (or fork this one first)
5. Click **"Deploy"**

### 2.2 Add Environment Variables

**Before clicking "Deploy"**, add these environment variables:

1. Click **"Environment Variables"** section
2. Add the first variable:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Paste your Supabase Project URL
   - Click **"Add"**
3. Add the second variable:
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Paste your Supabase anon public key
   - Click **"Add"**
4. Click **"Deploy"**

### 2.3 Wait for Deployment

- Deployment takes 2-3 minutes
- You'll see build logs in real-time
- When done, you'll get a URL like: `https://your-project.vercel.app`

### 2.4 Visit Your Site

Click the deployment URL and you should see your app! 🎉

## 🔧 Alternative Deployment Options

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/con2000us/Wilbur-s-rewardbook)

1. Click the button above
2. Sign in with GitHub
3. Add environment variables (same as Vercel)
4. Deploy!

### Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/con2000us/Wilbur-s-rewardbook)

1. Click the button above
2. Sign in with GitHub
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select this repository
4. Add build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Add environment variables (same as Vercel)
6. Deploy!

## ✅ Verification Checklist

After deployment, verify:

- [ ] Site loads without errors
- [ ] Can add a student
- [ ] Can add a subject
- [ ] Can add an assessment
- [ ] Can view student records
- [ ] Database operations work

## 🐛 Troubleshooting

### Issue: "Invalid API key"

**Solution**: Double-check your environment variables in Vercel:
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Verify both variables are set correctly
3. Redeploy if you changed them

### Issue: "Table does not exist"

**Solution**: Make sure you ran `setup-database.sql` completely:
1. Go to Supabase SQL Editor
2. Check if tables exist: `SELECT * FROM students LIMIT 1;`
3. If error, re-run `setup-database.sql`

### Issue: "Build failed"

**Solution**: 
1. Check build logs in Vercel
2. Common issues:
   - Missing environment variables
   - TypeScript errors (shouldn't happen, but check)
   - Node version mismatch

## 📚 Next Steps

After successful deployment:

1. **Customize**: Change site name in Settings page
2. **Add Students**: Start adding your students
3. **Set Up Subjects**: Create subjects for each student
4. **Configure Rules**: Set up reward rules
5. **Backup**: Use the backup feature to save your data

## 💡 Tips

- **Free Tier Limits**: 
  - Vercel: Unlimited deployments, 100GB bandwidth
  - Supabase: 500MB database, 2GB bandwidth
  - Both are free and sufficient for personal use

- **Custom Domain**: 
  - Vercel allows free custom domains
  - Go to Settings → Domains in Vercel dashboard

- **Environment Variables**:
  - Never commit `.env.local` to Git
  - Always set them in your hosting platform

## 🆘 Need Help?

- Check [GitHub Issues](https://github.com/con2000us/Wilbur-s-rewardbook/issues)
- Read the [README](README.md)
- Check [Database Setup Guide](DATABASE_SETUP.md)

---

**Happy Deploying! 🚀**

