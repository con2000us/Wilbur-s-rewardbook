# Wilbur's Reward Book

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![License](https://img.shields.io/badge/License-MIT-yellow)

A comprehensive student reward management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

> 💡 **Built with AI**: This project was developed using [Cursor](https://cursor.sh) with AI-powered vibe coding, demonstrating modern AI-assisted development workflows.

> ⚠️ **Security Warning**: This application currently has **NO authentication or access control**. When deployed publicly, **anyone with the URL can view and modify all data**. See [SECURITY_WARNING.md](./SECURITY_WARNING.md) for details and solutions.

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

### Prerequisites

**For Deployment (One-Click Deploy):**
- GitHub account (free) - [Sign up](https://github.com/signup)
- Vercel account (free) - [Sign up](https://vercel.com/signup) - Can use GitHub to sign in
- Supabase account (free) - [Sign up](https://supabase.com)

**For Local Development:**
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
Create a `.env.local` file and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
Execute the `add-*.sql` files in the Supabase SQL Editor to create the necessary tables.

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/con2000us/Wilbur-s-rewardbook&env=NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL)

**Steps:**
1. **Set up Supabase first** (Required):
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **SQL Editor** in your Supabase dashboard
   - Copy and paste the entire content of `setup-database.sql`
   - Click **Run** to create all database tables, functions, and triggers
   - ⚠️ **Important**: This step is **required** - the app won't work without it!
   - Go to **Settings** → **API** and copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Click the "Deploy with Vercel" button above
3. Sign in with GitHub
4. Add your Supabase environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"
6. Done! 🎉

> 💡 **Note**: The database setup (`setup-database.sql`) must be run **before** or **after** deployment, but it's **required** for the app to function. Supabase doesn't automatically create tables from code - you need to run the SQL script manually.

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
4. Copy and paste the entire content of `setup-database.sql`
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
   ```
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

---

[中文版 README](README.zh-TW.md)
