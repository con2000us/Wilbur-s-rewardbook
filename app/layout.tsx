import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { defaultLocale } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';
import StudentSettingsModalProvider from './components/StudentSettingsModalProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <StudentSettingsModalProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
