/**
 * Self-check: 確保 IMAGE_QUALITY_PROFILES 與規劃文案一致
 * 跑法：node --experimental-strip-types lib/imageQuality.check.ts
 *      或 npx tsx lib/imageQuality.check.ts
 *
 * 不依賴測試框架（ponytail：assert-based 自檢即可）。
 */
import {
  IMAGE_QUALITY_PROFILES,
  IMAGE_QUALITY_ORDER,
  DEFAULT_IMAGE_QUALITY_PROFILE,
  parseImageQualityProfile,
} from './imageQuality'

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('OK  :', msg)
}

// 1. 5 個 profile，順序固定
assert(IMAGE_QUALITY_ORDER.length === 5, '5 個檔位')
assert(
  JSON.stringify(IMAGE_QUALITY_ORDER) === JSON.stringify(['eco', 'normal', 'standard', 'high', 'original']),
  '檔位順序為 eco/normal/standard/high/original'
)

// 2. 預設值是 standard
assert(DEFAULT_IMAGE_QUALITY_PROFILE === 'standard', '預設值為 standard')

// 3. profile spec 對應實測值
assert(IMAGE_QUALITY_PROFILES.eco.maxDim === 800 && IMAGE_QUALITY_PROFILES.eco.quality === 0.7, 'eco = 800/0.7')
assert(IMAGE_QUALITY_PROFILES.normal.maxDim === 1200 && IMAGE_QUALITY_PROFILES.normal.quality === 0.7, 'normal = 1200/0.7')
assert(IMAGE_QUALITY_PROFILES.standard.maxDim === 1600 && IMAGE_QUALITY_PROFILES.standard.quality === 0.9, 'standard = 1600/0.9')
assert(IMAGE_QUALITY_PROFILES.high.maxDim === 2400 && IMAGE_QUALITY_PROFILES.high.quality === 0.9, 'high = 2400/0.9')
assert(IMAGE_QUALITY_PROFILES.original.bypass === true && IMAGE_QUALITY_PROFILES.original.maxDim === null, 'original 檔位 bypass + maxDim=null')

// 4. parser 在無效或缺失值時退回預設
assert(parseImageQualityProfile(null) === 'standard', 'null → standard')
assert(parseImageQualityProfile(undefined) === 'standard', 'undefined → standard')
assert(parseImageQualityProfile('') === 'standard', '空字串 → standard')
assert(parseImageQualityProfile('foobar') === 'standard', '無效 key → standard')
assert(parseImageQualityProfile('eco') === 'eco', '有效 key → 回原值')
assert(parseImageQualityProfile('original') === 'original', 'original → original')

console.log('\nAll image quality self-checks passed.')
