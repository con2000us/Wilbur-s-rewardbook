export type SupportedLocale = 'zh-TW' | 'en'

export function parsePreferredLocale(input: string | undefined): SupportedLocale {
  return input === 'zh-TW' ? 'zh-TW' : 'en'
}

export function toCanonicalKey(input: string, fallbackPrefix: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || `${fallbackPrefix}_${Date.now()}`
}

export function resolveLocalizedText(params: {
  locale: SupportedLocale
  translations: Array<{ locale: string; name: string; description?: string | null }>
  fallbackZhName?: string | null
  fallbackEnName?: string | null
  fallbackZhDescription?: string | null
  fallbackEnDescription?: string | null
  fallbackName?: string | null
  fallbackDescription?: string | null
}) {
  const {
    locale,
    translations,
    fallbackZhName,
    fallbackEnName,
    fallbackZhDescription,
    fallbackEnDescription,
    fallbackName,
    fallbackDescription,
  } = params
  const zh = translations.find((translation) => translation.locale === 'zh-TW')
  const en = translations.find((translation) => translation.locale === 'en')
  const preferred =
    translations.find((translation) => translation.locale === locale) ||
    zh ||
    en ||
    null

  return {
    name: preferred?.name || fallbackName || fallbackZhName || fallbackEnName || '',
    description:
      preferred?.description ||
      fallbackDescription ||
      fallbackZhDescription ||
      fallbackEnDescription ||
      '',
    name_zh: zh?.name || fallbackZhName || fallbackName || fallbackEnName || '',
    name_en: en?.name || fallbackEnName || null,
    description_zh: zh?.description || fallbackZhDescription || fallbackDescription || fallbackEnDescription || null,
    description_en: en?.description || fallbackEnDescription || null,
  }
}

export function buildDualLocalePayload(input: {
  locale?: string
  name?: string | null
  description?: string | null
  name_zh?: string | null
  name_en?: string | null
  description_zh?: string | null
  description_en?: string | null
}) {
  const locale = parsePreferredLocale(input.locale || undefined)
  const name = (input.name || '').trim()
  const nameZh = (input.name_zh || (locale === 'zh-TW' ? name : '') || '').trim()
  const nameEn = (input.name_en || (locale === 'en' ? name : '') || '').trim()
  const descriptionZh = input.description_zh ?? (locale === 'zh-TW' ? input.description : null)
  const descriptionEn = input.description_en ?? (locale === 'en' ? input.description : null)

  return {
    locale,
    name,
    nameZh,
    nameEn,
    descriptionZh,
    descriptionEn,
  }
}
