/**
 * Server-only AES-256-GCM encryption utility for AI provider API keys.
 *
 * Passphrase: any custom string (e.g. "mySecret123")
 * Derived key: SHA-256(passphrase) → 32-byte AES-256 key
 * Ciphertext format: hex(iv:12B) + ":" + hex(ciphertext) + ":" + hex(authTag:16B)
 *
 * NEVER import this on the client side.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Derive a 32-byte AES-256 key from a passphrase of any length.
 * Uses SHA-256 to produce a fixed-length key.
 */
function deriveKey(passphrase: string): Buffer {
  return crypto.createHash('sha256').update(passphrase).digest()
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param plaintext - The text to encrypt
 * @param encryptionSecret - Any custom passphrase string (e.g. "mySecret123")
 * @returns Encrypted string: "hex(iv):hex(ciphertext):hex(authTag)"
 */
export function encrypt(plaintext: string, encryptionSecret: string): string {
  if (!encryptionSecret || encryptionSecret.length === 0) {
    throw new Error('Encryption secret must not be empty')
  }

  const key = deriveKey(encryptionSecret)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

/**
 * Decrypt ciphertext with AES-256-GCM.
 * @param ciphertext - Encrypted string in "hex(iv):hex(ciphertext):hex(authTag)" format
 * @param encryptionSecret - The same passphrase used for encryption
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, encryptionSecret: string): string {
  if (!encryptionSecret || encryptionSecret.length === 0) {
    throw new Error('Encryption secret must not be empty')
  }

  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected "iv:ciphertext:authTag"')
  }

  const [ivHex, encryptedHex, authTagHex] = parts

  const key = deriveKey(encryptionSecret)
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Get the encryption secret from server environment.
 * Can be any custom passphrase; SHA-256 is used to derive the actual key.
 */
export function getEncryptionSecret(): string {
  const secret = process.env.AI_PROVIDER_KEY_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error(
      'AI_PROVIDER_KEY_ENCRYPTION_SECRET is not set in server environment.'
    )
  }
  return secret
}

/**
 * Get the active key version from server environment.
 * Defaults to "1" if not set.
 */
export function getActiveKeyVersion(): string {
  return process.env.AI_PROVIDER_KEY_ACTIVE_VERSION || '1'
}

/**
 * Generate a random passphrase suggestion.
 * Run: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
 */
export function generateEncryptionSecret(): string {
  return crypto.randomBytes(16).toString('hex')
}
