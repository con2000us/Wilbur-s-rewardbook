/**
 * 評量附圖儲存品質檔位（Image quality profiles for assessment attachments）
 *
 * 由 ResourceModeSettings 滑桿選擇後，存入 site_settings.image_quality_profile，
 * ImageUploader 會在上傳前依此 profile 對圖片做 resize + JPEG 壓縮。
 *
 * 預設值與 OCR 實測結果（qwen3.6-flash, A4 試卷）：
 *   eco       800px / q70  → API 拒絕（HTTP 400）
 *   normal    1200px / q70 → 18s, 100% 命中
 *   standard  1600px / q90 → 37s, 100% 命中（推薦）
 *   high      2400px / q90 → 40s, 100% 命中、小字辨識最佳
 *   original  原檔 bypass  → 容易 timeout，但保留 EXIF
 */

export type ImageQualityProfile = 'eco' | 'normal' | 'standard' | 'high' | 'original'

export interface ImageQualityProfileSpec {
  /** 最長邊上限；null 代表不縮放（搭配 bypass 使用） */
  maxDim: number | null
  /** JPEG 品質 0..1（PNG 會 ignore；bypass=true 時亦無作用） */
  quality: number
  /** true 表示完全跳過 canvas 重繪，原檔直接上傳（保留 EXIF） */
  bypass: boolean
}

export const IMAGE_QUALITY_PROFILES: Record<ImageQualityProfile, ImageQualityProfileSpec> = {
  eco:      { maxDim: 800,  quality: 0.7, bypass: false },
  normal:   { maxDim: 1200, quality: 0.7, bypass: false },
  standard: { maxDim: 1600, quality: 0.9, bypass: false },
  high:     { maxDim: 2400, quality: 0.9, bypass: false },
  original: { maxDim: null, quality: 1.0, bypass: true  },
}

export const IMAGE_QUALITY_ORDER: ImageQualityProfile[] = [
  'eco', 'normal', 'standard', 'high', 'original',
]

export const DEFAULT_IMAGE_QUALITY_PROFILE: ImageQualityProfile = 'standard'

export const IMAGE_QUALITY_SETTING_KEY = 'image_quality_profile'

export function parseImageQualityProfile(value: string | null | undefined): ImageQualityProfile {
  return (IMAGE_QUALITY_ORDER as string[]).includes(value || '')
    ? (value as ImageQualityProfile)
    : DEFAULT_IMAGE_QUALITY_PROFILE
}

// ponytail self-check: 確保 ORDER 和 PROFILES 同步，避免漏配對
if (process.env.NODE_ENV !== 'production') {
  const orderSet = new Set(IMAGE_QUALITY_ORDER)
  const profileKeys = Object.keys(IMAGE_QUALITY_PROFILES)
  if (orderSet.size !== IMAGE_QUALITY_ORDER.length) {
    throw new Error('IMAGE_QUALITY_ORDER contains duplicates')
  }
  if (profileKeys.length !== IMAGE_QUALITY_ORDER.length || !profileKeys.every(k => orderSet.has(k as ImageQualityProfile))) {
    throw new Error('IMAGE_QUALITY_ORDER and IMAGE_QUALITY_PROFILES are out of sync')
  }
}
