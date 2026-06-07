export const AUTH_COOKIE_NAME = 'site-auth'

const AUTH_TOKEN_VERSION = 'v1'
const DEV_DEFAULT_PASSWORD = 'password'

export function getSitePassword() {
  const configuredPassword = process.env.SITE_PASSWORD?.trim()

  if (configuredPassword) {
    return configuredPassword
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_DEFAULT_PASSWORD
  }

  return null
}

export async function createAuthToken(secret: string) {
  const digest = await sha256(`${AUTH_TOKEN_VERSION}:${secret}`)
  return `${AUTH_TOKEN_VERSION}.${digest}`
}

export async function isValidAuthToken(token: string | undefined) {
  const secret = getSitePassword()

  if (!secret || !token) {
    return false
  }

  const expectedToken = await createAuthToken(secret)
  return constantTimeEqual(token, expectedToken)
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}
