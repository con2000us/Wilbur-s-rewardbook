import { NextRequest } from 'next/server'

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim()
}

export function absoluteRequestUrl(request: NextRequest, path: string) {
  const host =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ||
    firstHeaderValue(request.headers.get('host')) ||
    request.nextUrl.host
  const protocol =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ||
    request.nextUrl.protocol.replace(/:$/, '') ||
    'http'

  return new URL(path, `${protocol}://${host}`)
}
