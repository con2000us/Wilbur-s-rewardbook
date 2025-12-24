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

Use this if you're not familiar with coding. You'll deploy to Vercel and only need to copy/paste one SQL file into Supabase.

**Prerequisites:**
- Supabase account (free) - [Sign up](https://supabase.com)
- Vercel account (free) - [Sign up](https://vercel.com/signup)
- GitHub account (free) - [Sign up](https://github.com/signup)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SITE_PASSWORD)

**Steps:**
1. **Set up Supabase first** (Required):
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **SQL Editor**
   - Copy and paste the entire content of `database/setup-database.sql`
   - Click **Run**
   - Go to **Settings** → **API** and copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Click the **Deploy with Vercel** button above
3. Sign in with GitHub
4. Add environment variables (Vercel will ask for them):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SITE_PASSWORD` (set a strong password)
5. Click **Deploy**

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
```

4. Run database migrations:
Execute `database/setup-database.sql` in the Supabase SQL Editor (recommended), or run the individual migration files under `database/migrations/`.

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SITE_PASSWORD)

**Steps:**
1. **Set up Supabase first** (Required):
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **SQL Editor** in your Supabase dashboard
   - Copy and paste the entire content of `database/setup-database.sql`
   - Click **Run** to create all database tables, functions, and triggers
   - ⚠️ **Important**: This step is **required** - the app won't work without it!
   - Go to **Settings** → **API** and copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Click the "Deploy with Vercel" button above
3. Sign in with GitHub
4. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SITE_PASSWORD` - **Required**: Set a strong password to protect your site
5. Click "Deploy"
6. Done! 🎉

> 💡 **Note**: The database setup (`database/setup-database.sql`) must be run **before** or **after** deployment, but it's **required** for the app to function. Supabase doesn't automatically create tables from code - you need to run the SQL script manually.

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
4. Copy and paste the entire content of `database/setup-database.sql`
5. Click **Run** to execute the SQL
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
