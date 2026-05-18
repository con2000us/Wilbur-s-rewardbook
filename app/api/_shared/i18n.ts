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
