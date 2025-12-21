/**
 * 將 hex 顏色轉換為較深的版本（用於漸變效果）
 */
function hexToDarker(hex: string, factor: number = 0.7): string {
  const normalizedHex = hex.toLowerCase().startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`
  const r = parseInt(normalizedHex.slice(1, 3), 16)
  const g = parseInt(normalizedHex.slice(3, 5), 16)
  const b = parseInt(normalizedHex.slice(5, 7), 16)
  
  const darkerR = Math.floor(r * factor)
  const darkerG = Math.floor(g * factor)
  const darkerB = Math.floor(b * factor)
  
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`
}

/**
 * 將 Tailwind 漸變類名轉換為 hex 顏色（用於向後兼容）
 */
function gradientToHex(gradient: string): string {
  const match = gradient.match(/from-(\w+)-(\d+)/)
  if (match) {
    const [, colorName, shade] = match
    const colorMap: Record<string, Record<string, string>> = {
      blue: { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb' },
      purple: { '400': '#a78bfa', '500': '#9333ea', '600': '#7e22ce' },
      pink: { '400': '#f472b6', '500': '#ec4899', '600': '#db2777' },
      green: { '400': '#4ade80', '500': '#22c55e', '600': '#16a34a' },
      yellow: { '400': '#facc15', '500': '#eab308', '600': '#ca8a04' },
      red: { '400': '#f87171', '500': '#ef4444', '600': '#dc2626' },
      indigo: { '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5' },
      teal: { '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488' },
    }
    return colorMap[colorName]?.[shade] || '#3b82f6'
  }
  return '#3b82f6'
}

/**
 * 解析學生頭像以獲取 emoji 和背景顏色（hex）
 * 返回格式：{ emoji: string, hex: string, gradientStyle: string }
 */
export function parseStudentAvatar(avatarUrl: string | null, studentName: string = '') {
  const defaultHex = '#3b82f6' // 預設藍色
  
  if (!avatarUrl) {
    return {
      emoji: studentName.charAt(0) || '👤',
      hex: defaultHex,
      gradientStyle: `linear-gradient(to bottom right, ${defaultHex}, ${hexToDarker(defaultHex)})`
    }
  }
  
  if (avatarUrl.startsWith('emoji:')) {
    const parts = avatarUrl.replace('emoji:', '').split('|')
    const colorPart = parts[1] || defaultHex
    // 判斷是 hex 顏色還是舊的 Tailwind 類名
    const hex = colorPart.startsWith('#') ? colorPart : gradientToHex(colorPart)
    return {
      emoji: parts[0] || studentName.charAt(0) || '👤',
      hex: hex,
      gradientStyle: `linear-gradient(to bottom right, ${hex}, ${hexToDarker(hex)})`
    }
  }
  
  // 舊格式兼容
  const parts = avatarUrl.split('|')
  if (parts.length === 2) {
    const colorPart = parts[1]
    const hex = colorPart.startsWith('#') ? colorPart : gradientToHex(colorPart)
    return {
      emoji: parts[0].replace('emoji:', '') || studentName.charAt(0) || '👤',
      hex: hex,
      gradientStyle: `linear-gradient(to bottom right, ${hex}, ${hexToDarker(hex)})`
    }
  }
  
  return {
    emoji: studentName.charAt(0) || '👤',
    hex: defaultHex,
    gradientStyle: `linear-gradient(to bottom right, ${defaultHex}, ${hexToDarker(defaultHex)})`
  }
}

/**
 * 獲取學生背景漸變色（向後兼容，返回 Tailwind 類名）
 * @deprecated 請使用 parseStudentAvatar 並使用內聯樣式
 */
export function getStudentBackgroundGradient(avatarUrl: string | null, studentName: string = ''): string {
  const avatar = parseStudentAvatar(avatarUrl, studentName)
  // 為了向後兼容，返回一個預設的 Tailwind 類名
  return 'from-blue-400 to-purple-500'
}

