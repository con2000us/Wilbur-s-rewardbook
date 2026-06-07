# Wilbur's Reward Book

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![License](https://img.shields.io/badge/License-MIT-yellow)

> 中文說明請看：[README.zh-TW.md](./README.zh-TW.md)  
> For Traditional Chinese, see: [README.zh-TW.md](./README.zh-TW.md)

A comprehensive student reward management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

> 💡 **Built with AI**: This project was developed using [Cursor](https://cursor.sh) with AI-powered vibe coding, demonstrating modern AI-assisted development workflows.

> 🔒 **Security**: This application includes **password protection**. **Important**: Set the `SITE_PASSWORD` environment variable in your deployment to secure your site. If not set, a default password is used (not secure for production). See [PASSWORD_PROTECTION_SETUP.md](./docs/PASSWORD_PROTECTION_SETUP.md) for setup instructions.

**Perfect for**: Teachers, Parents, Tutors, and Educators who want to track student progress, manage assessments, and implement reward systems.

## Features

- 📚 **Student Management**: Add, edit, and delete students with custom avatars and background colors
- 📖 **Subject Management**: Create and manage multiple subjects for each student
- 📝 **Assessment Records**: Record student exam, quiz, homework, and project scores
- 💰 **Reward Passbook**: Track student reward earnings, spending, and reset transactions
- 🎁 **Reward Rules**: Set flexible reward rules (global, student-specific, subject-specific)
- 📊 **Report Printing**: Generate and print student learning records and reward passbook reports
- 🌐 **Multi-language Support**: Supports Traditional Chinese and English
- 💾 **Data Backup**: Export/import JSON backups with database storage support
- 🎨 **Modern UI**: Responsive design with smooth animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Internationalization**: next-intl
- **Deployment**: Vercel (Recommended)

## Getting Started

### Recommended for non-technical users (One-Click Deploy)

Use this if you're not familiar with coding. You'll deploy to Vercel and copy/paste the bootstrap SQL files into Supabase.

**Prerequisites:**
- Supabase account (free) - [Sign up](https://supabase.com)
- Vercel account (free) - [Sign up](https://vercel.com/signup)
- GitHub account (free) - [Sign up](https://github.com/signup)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SITE_PASSWORD,SUPABASE_SERVICE_ROLE_KEY,AI_PROVIDER_KEY_ENCRYPTION_SECRET,AI_PROVIDER_KEY_ACTIVE_VERSION)

**Steps:**
1. **Set up Supabase first** (Required):
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **SQL Editor**
   - Run the SQL files under `database/bootstrap/` in order:
     - `database/bootstrap/01_schema.sql`
     - `database/bootstrap/02_seed_defaults.sql`
     - Optional: `database/bootstrap/03_seed_optional.sql`
   - Click **Run** after each file
   - Go to **Settings** → **API** and copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *(Optional, for **large goal image upload**)* In Supabase **Storage**, create a public bucket named **`goal-images`** and add a read policy as described in **`docs/STORAGE_BUCKET_SETUP.md`**. Add **`SUPABASE_SERVICE_ROLE_KEY`** (the **service_role** secret from the same API page) to Vercel or `.env.local`—server-only, never expose to the browser.
2. Click the **Deploy with Vercel** button above
3. Sign in with GitHub
4. Click **Deploy** to start the Vercel setup flow
5. When Vercel asks for environment variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SITE_PASSWORD` (set a strong password)
   - `AI_PROVIDER_KEY_ENCRYPTION_SECRET` (server-only secret used to encrypt and decrypt saved AI provider API keys)
   - `AI_PROVIDER_KEY_ACTIVE_VERSION` (version label for newly encrypted AI provider keys; use `1` unless rotating the encryption secret)
   - *(Optional)* `SUPABASE_SERVICE_ROLE_KEY` — same **service_role** value as above; recommended for **large goal** image uploads
6. Continue and finish the deployment
7. After deployment finishes, open your site:
   - In Vercel, open your new project → **Deployments** (or **Project**)
   - Click the **Production** URL (it looks like `https://your-project.vercel.app`)

### Local Development (Advanced)

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/con2000us/Wilbur-s-rewardbook.git
cd wilburs-rewardbook
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file and add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SITE_PASSWORD=your-strong-password-here
AI_PROVIDER_KEY_ENCRYPTION_SECRET=your-random-encryption-secret
AI_PROVIDER_KEY_ACTIVE_VERSION=1
# Optional: large goal image uploads — Settings → API → service_role (server-only)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
```

AI provider environment variables:
- `AI_PROVIDER_KEY_ENCRYPTION_SECRET` is a server-only passphrase used to encrypt and decrypt AI provider API keys saved from **Settings → AI Assessment**. Keep this value stable. If you change it later, previously saved AI provider keys cannot be decrypted unless you re-enter or rotate them.
- `AI_PROVIDER_KEY_ACTIVE_VERSION` is the version label stored with newly encrypted AI provider keys. Use `1` for normal installs; increment it only when intentionally rotating the encryption secret and re-saving provider keys.

4. Run database migrations:
For a fresh project, run `database/bootstrap/01_schema.sql` and then `database/bootstrap/02_seed_defaults.sql` in the Supabase SQL Editor. Optional demo/sample data lives in `database/bootstrap/03_seed_optional.sql` and `04_seed_demo_*.sql`.

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
wilburs-rewardbook/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── settings/          # Settings pages
│   ├── student/           # Student-related pages
│   └── students/          # Student management pages
├── lib/                   # Utility functions and configs
│   ├── i18n/             # Internationalization config
│   ├── supabase/         # Supabase clients
│   └── utils/            # Utility functions
├── locales/              # Translation files
│   ├── zh-TW.json       # Traditional Chinese
│   └── en.json           # English
└── public/               # Static assets
```

## 🚀 Quick Deploy / 快速部署

### One-Click Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SITE_PASSWORD,SUPABASE_SERVICE_ROLE_KEY,AI_PROVIDER_KEY_ENCRYPTION_SECRET,AI_PROVIDER_KEY_ACTIVE_VERSION)

**Steps:**
1. **Set up Supabase first** (Required):
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **SQL Editor** in your Supabase dashboard
   - Run the SQL files under `database/bootstrap/` in order:
     - `database/bootstrap/01_schema.sql`
     - `database/bootstrap/02_seed_defaults.sql`
     - Optional: `database/bootstrap/03_seed_optional.sql`
   - Click **Run** after each file to create tables, defaults, and optional sample data
   - ⚠️ **Important**: This step is **required** - the app won't work without it!
   - Go to **Settings** → **API** and copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *(Optional, for **large goal image upload**)* Create public Storage bucket **`goal-images`** and policies per **`docs/STORAGE_BUCKET_SETUP.md`**.

2. Click the "Deploy with Vercel" button above
3. Sign in with GitHub
4. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SITE_PASSWORD` - **Required**: Set a strong password to protect your site
   - `AI_PROVIDER_KEY_ENCRYPTION_SECRET` - **Required for AI assessment settings**: server-only secret used to encrypt and decrypt saved AI provider API keys
   - `AI_PROVIDER_KEY_ACTIVE_VERSION` - Recommended: set to `1`; version label for newly encrypted keys, increment only when rotating the encryption secret
   - *(Optional)* `SUPABASE_SERVICE_ROLE_KEY` - **service_role** from the same API page; recommended for large goal uploads (keep secret)
5. Click "Deploy"
6. Done! 🎉

> 💡 **Note**: The database setup (`database/bootstrap/*.sql`) must be run **before** or **after** deployment, but it's **required** for the app to function. Supabase doesn't automatically create tables from code - you need to run the SQL manually.

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/con2000us/Wilbur-s-rewardbook)

### Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/con2000us/Wilbur-s-rewardbook)

### Use as Template

Click the green **"Use this template"** button at the top of this repository to create your own copy.

## 📋 Deployment Guide

### Prerequisites

Before deploying, you need:
1. **Supabase Account** (Free): [supabase.com](https://supabase.com)
2. **GitHub Account** (Free)

### Step-by-Step Deployment

#### 1. Set up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to **SQL Editor** in your Supabase dashboard
4. Run the SQL files under `database/bootstrap/` in order:
   - `database/bootstrap/01_schema.sql`
   - `database/bootstrap/02_seed_defaults.sql`
   - Optional: `database/bootstrap/03_seed_optional.sql`
5. Click **Run** after each file
6. Go to **Settings** → **API** and copy:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. Deploy to Vercel (3 minutes)

1. Click the **"Deploy with Vercel"** button above
2. Sign in with your GitHub account
3. Click **"New Project"**
4. In **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SITE_PASSWORD=your-strong-password-here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
   AI_PROVIDER_KEY_ENCRYPTION_SECRET=your-random-encryption-secret
   AI_PROVIDER_KEY_ACTIVE_VERSION=1
   ```
   
   > 💡 **Password Protection**: The app includes password protection. Set `SITE_PASSWORD` to protect your site. See [PASSWORD_PROTECTION_SETUP.md](./docs/PASSWORD_PROTECTION_SETUP.md) for details.
5. Click **"Deploy"**
6. Wait 2-3 minutes for deployment to complete
7. Visit your deployed site! 🎉

### Other Deployment Options

You can also deploy to:
- **Netlify**: Import from GitHub and set environment variables
- **Railway**: Use the Railway button above
- **Render**: Use the Render button above
- **Self-hosted**: Use Docker or any Node.js hosting

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!

## Development

This project was developed using [Cursor](https://cursor.sh) with AI-powered vibe coding, showcasing modern AI-assisted development workflows. The entire codebase was built through iterative AI collaboration, demonstrating how AI can accelerate full-stack application development.

## Contact

For questions or suggestions, please contact us via GitHub Issues.

## ⚠️ Important Notices

### 🤖 AI-Generated Project

**This entire project, including all code and documentation, was generated using AI (Cursor with AI-powered coding).**

- The project is provided "as is"
- No guarantee of functionality or support
- Use at your own risk

### 💾 Data Backup & Disclaimer

**This website provides data backup functionality. We strongly recommend regular backups.**

**⚠️ Important**:
- This project makes **NO commitment** regarding data preservation or loss
- Users are responsible for their own data backup
- The project developers are not liable for any data loss
- Always maintain your own backups

**Recommendation**:
- ✅ Backup your data regularly (weekly or monthly)
- ✅ Use the built-in backup feature
- ✅ Download and save backup files locally
- ✅ Test backup restoration periodically

---

[中文版 README](README.zh-TW.md)
