export const locales = ['en', 'zh-TW'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  'en': 'English'
}

