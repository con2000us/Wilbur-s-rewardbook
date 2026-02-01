import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import HomePageClient from './components/HomePageClient'

// 首頁獨立的 viewport 設置 - 使用原本的 initialScale
export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  themeColor: '#6a99e0',
  viewportFit: 'cover',
}

export default async function Home() {
  const supabase = createClient()
  const t = await getTranslations('home')
  
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .order('display_order', { ascending: true })

  const { data: siteNameSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site_name')
    .single()
  
  // @ts-ignore - Supabase type inference issue with select queries
  const siteName = (siteNameSetting as any)?.value || t('title')

  return (
    <HomePageClient students={students || []} siteName={siteName} />
  )
}
