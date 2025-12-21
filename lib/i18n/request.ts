import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale } from './config'

export default getRequestConfig(async () => {
  // 從 cookie 獲取語言設定
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default
  }
})

