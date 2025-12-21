# Wilbur's Reward Book

A comprehensive student reward management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

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

## Deployment

### Vercel Deployment (Recommended)

1. Push the project to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy!

### Other Deployment Options

You can also deploy to other Next.js-compatible platforms such as:
- Netlify
- Railway
- Render
- Self-hosted server (using Docker)

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!

## Contact

For questions or suggestions, please contact us via GitHub Issues.

---

[中文版 README](README.zh-TW.md)
