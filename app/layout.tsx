import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { defaultLocale } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';
import StudentSettingsModalProvider from './components/StudentSettingsModalProvider';
import ThemeDebugProbe from './components/ThemeDebugProbe';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport 設置 - 確保手機正確顯示
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.8, // 首頁之外的頁面使用較小的縮放
  maximumScale: 5.0,
  userScalable: true,
  // 添加以下屬性以更好地支援移動設備
  themeColor: '#6a99e0',
  viewportFit: 'cover',
}

// 動態生成 metadata
export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient()
  
  const { data: siteNameSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site_name')
    .single()
  
  // @ts-ignore - Supabase type inference issue with select queries
  const siteName = (siteNameSetting as any)?.value || "Wilbur's RewardBook"
  
  return {
    title: siteName,
    description: "Learning Reward Tracking System",
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 從 cookie 獲取當前語言
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
  
  // 動態加載對應語言的翻譯文件
  const messages = (await import(`../locales/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        {/* Google Fonts: Noto Sans TC */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
        {/* Material Symbols */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* Material Icons Outlined */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
        {/* Material Icons Round */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeDebugProbe />
          {children}
          <StudentSettingsModalProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
