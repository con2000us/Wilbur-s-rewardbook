/**
 * GET /api/settings/ai-provider-key
 *
 * Returns active AI provider configs without exposing the actual API keys.
 * Used by the settings page to show current configuration status.
 *
 * POST /api/settings/ai-provider-key
 *
 * Add or update an encrypted AI provider API key.
 * The plaintext key is encrypted server-side before storing.
 *
 * Supports separate keys for vision (image→text) and text (OCR→JSON) steps.
 * A single key with purpose "both" works for both steps.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, getEncryptionSecret, getActiveKeyVersion } from '@/lib/crypto/encryption'

const ALLOWED_PURPOSE = ['vision', 'text', 'both'] as const

export async function GET() {
  // Check encryption status first — independent of DB
  const encryptionConfigured = !!process.env.AI_PROVIDER_KEY_ENCRYPTION_SECRET

  let configs: Array<{
    id: string
    provider: string
    label: string | null
    purpose: string
    endpoint_url: string | null
    is_active: boolean
    key_version: string
    created_at: string
    updated_at: string
  }> = []

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('id, provider, label, purpose, endpoint_url, is_active, key_version, created_at, updated_at')
      .order('purpose', { ascending: true })

    if (!error && data) {
      configs = data
    }
    // If table doesn't exist or query fails, return empty configs with encryption status still intact
  } catch {
    // DB not available — return encryption status only, configs will be empty
  }

  return NextResponse.json({
    configs,
    encryptionConfigured,
    hasEncryptionSecret: encryptionConfigured,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider, apiKey, label, purpose, endpointUrl } = body

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }
    const resolvedPurpose = purpose || 'both'
    if (!ALLOWED_PURPOSE.includes(resolvedPurpose)) {
      return NextResponse.json(
        { error: `purpose must be one of: ${ALLOWED_PURPOSE.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const keyVersion = getActiveKeyVersion()
    const trimmedApiKey = typeof apiKey === 'string' ? apiKey.trim() : ''

    if (!trimmedApiKey) {
      const { data: existingConfig } = await supabase
        .from('ai_provider_configs')
        .select('id')
        .eq('purpose', resolvedPurpose)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!existingConfig) {
        return NextResponse.json({ error: 'API key is required for a new provider config' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .update({
          provider,
          label: label || null,
          endpoint_url: endpointUrl || null,
          key_version: keyVersion,
          is_active: true,
        })
        .eq('id', existingConfig.id)
        .select('id, provider, label, key_version, purpose, endpoint_url, is_active, created_at, updated_at')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        config: {
          id: data.id,
          provider: data.provider,
          label: data.label,
          key_version: data.key_version,
          purpose: data.purpose,
          endpoint_url: data.endpoint_url,
          has_key: true,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      })
    }

    // Encrypt the API key
    let encrypted: string
    try {
      const secret = getEncryptionSecret()
      encrypted = encrypt(trimmedApiKey, secret)
    } catch (err) {
      return NextResponse.json(
        { error: 'Encryption failed. Check server encryption secret.' },
        { status: 500 }
      )
    }

    // Deactivate existing keys for this provider + purpose combination
    await supabase
      .from('ai_provider_configs')
      .update({ is_active: false })
      .eq('provider', provider)
      .eq('purpose', resolvedPurpose)
      .eq('is_active', true)

    // Insert new key
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .insert({
        provider,
        label: label || null,
        encrypted_api_key: encrypted,
        key_version: keyVersion,
        purpose: resolvedPurpose,
        endpoint_url: endpointUrl || null,
        is_active: true,
      })
      .select('id, provider, label, key_version, purpose, endpoint_url, is_active, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: {
        id: data.id,
        provider: data.provider,
        label: data.label,
        key_version: data.key_version,
        purpose: data.purpose,
        has_key: true,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save provider key' },
      { status: 500 }
    )
  }
}
