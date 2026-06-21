const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/'

function getSupabaseProxyPath(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return ''

  try {
    const pathname = new URL(supabaseUrl).pathname.replace(/\/+$/, '')
    return pathname === '/' ? '' : pathname
  } catch {
    return ''
  }
}

/**
 * Use the app origin for self-hosted Supabase installations mounted below a
 * path (for example /supabase). This avoids leaking a deployment-specific
 * hostname into saved image data and keeps images same-origin in the browser.
 */
export function toBrowserPublicStorageUrl(url: string): string {
  if (!url) return url

  const proxyPath = getSupabaseProxyPath()
  if (!proxyPath) return url

  try {
    const parsed = new URL(url, 'http://local.invalid')
    const objectPathIndex = parsed.pathname.indexOf(PUBLIC_OBJECT_PATH)
    if (objectPathIndex === -1) return url

    const objectPath = parsed.pathname.slice(objectPathIndex)
    return `${proxyPath}${objectPath}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}

/** Resolve a browser-safe relative storage URL back to an absolute URL for server fetches. */
export function toServerPublicStorageUrl(url: string): string {
  if (!url || /^https?:\/\//i.test(url)) return url

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return url

  try {
    return new URL(url, new URL(supabaseUrl).origin).toString()
  } catch {
    return url
  }
}
