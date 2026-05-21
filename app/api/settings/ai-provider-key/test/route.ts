import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt, getEncryptionSecret } from '@/lib/crypto/encryption'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const ALLOWED_PURPOSE = ['vision', 'text'] as const
const VISION_TEST_IMAGE_BASE64 =
  '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'

type TestPurpose = (typeof ALLOWED_PURPOSE)[number]

type TestRequestBody = {
  purpose?: TestPurpose
  provider?: string
  apiKey?: string
  endpointUrl?: string | null
  model?: string | null
}

type ProviderConfigRow = {
  provider: string
  purpose: string
  endpoint_url: string | null
  encrypted_api_key: string
}

function normalizeBaseUrl(endpointUrl?: string | null) {
  const raw = (endpointUrl || OPENROUTER_BASE_URL).trim().replace(/\/+$/, '')
  if (raw.endsWith('/chat/completions')) {
    return raw.slice(0, -'/chat/completions'.length)
  }
  return raw || OPENROUTER_BASE_URL
}

function compactErrorText(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 600)
}

function getAssistantText(content: unknown) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text || '')
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

async function loadModel(purpose: TestPurpose, requestedModel?: string | null) {
  const model = requestedModel?.trim()
  if (model) return model

  const supabase = createClient()
  const keys =
    purpose === 'vision'
      ? ['ai_assessment_model_vision', 'ai_assessment_model_primary']
      : ['ai_assessment_model_text', 'ai_assessment_model_primary']

  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', keys)

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value || ''
  }

  return (
    settings[purpose === 'vision' ? 'ai_assessment_model_vision' : 'ai_assessment_model_text'] ||
    settings['ai_assessment_model_primary'] ||
    'openrouter/free'
  )
}

async function loadSavedProviderConfig(purpose: TestPurpose): Promise<ProviderConfigRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ai_provider_configs')
    .select('provider, purpose, endpoint_url, encrypted_api_key')
    .eq('is_active', true)

  if (error || !data) return null

  return (
    (data as ProviderConfigRow[]).find((config) => config.purpose === purpose) ||
    (data as ProviderConfigRow[]).find((config) => config.purpose === 'both') ||
    null
  )
}

async function resolveApiKey(purpose: TestPurpose, body: TestRequestBody) {
  const providedKey = body.apiKey?.trim()
  const savedConfig = providedKey ? null : await loadSavedProviderConfig(purpose)

  if (providedKey) {
    return {
      apiKey: providedKey,
      provider: body.provider?.trim() || 'openrouter',
      endpointUrl: body.endpointUrl || null,
      keySource: 'form' as const,
    }
  }

  if (!savedConfig) {
    throw new Error('No saved API key found. Enter a key or save this provider config first.')
  }

  const secret = getEncryptionSecret()
  return {
    apiKey: decrypt(savedConfig.encrypted_api_key, secret),
    provider: body.provider?.trim() || savedConfig.provider,
    endpointUrl: body.endpointUrl !== undefined ? body.endpointUrl : savedConfig.endpoint_url,
    keySource: 'saved' as const,
  }
}

async function callChatCompletion(params: {
  purpose: TestPurpose
  apiKey: string
  endpointUrl?: string | null
  model: string
}) {
  const baseUrl = normalizeBaseUrl(params.endpointUrl)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  const userContent =
    params.purpose === 'vision'
      ? [
          {
            type: 'text',
            text: 'This is a connection test. Read the large text in the image and reply with exactly that text.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${VISION_TEST_IMAGE_BASE64}`,
            },
          },
        ]
      : 'This is a connection test. Reply with exactly: TEXT_OK'

  try {
    const startedAt = Date.now()
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Wilbur RewardBook',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: 'system',
            content:
              'You are only testing whether an AI provider configuration is reachable. Keep the response short.',
          },
          { role: 'user', content: userContent },
        ],
        max_tokens: 24,
        temperature: 0,
      }),
    })

    const durationMs = Date.now() - startedAt
    const responseText = await response.text()

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        durationMs,
        error: `Provider returned ${response.status}: ${compactErrorText(responseText) || response.statusText}`,
      }
    }

    let data: { choices?: Array<{ message?: { content?: unknown } }>; model?: string }
    try {
      data = JSON.parse(responseText) as {
        choices?: Array<{ message?: { content?: unknown } }>
        model?: string
      }
    } catch {
      return {
        ok: false,
        status: response.status,
        durationMs,
        error: 'Provider returned a non-JSON response.',
      }
    }

    const content = getAssistantText(data.choices?.[0]?.message?.content).trim()
    if (!content) {
      return {
        ok: false,
        status: response.status,
        durationMs,
        model: data.model || params.model,
        error: 'Provider returned an empty assistant message.',
      }
    }

    return {
      ok: true,
      status: response.status,
      durationMs,
      model: data.model || params.model,
      sample: content.slice(0, 160),
    }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Provider test timed out after 20 seconds.'
        : error instanceof Error
          ? error.message
          : 'Provider test failed.'

    return {
      ok: false,
      error: message,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestRequestBody
    const purpose = body.purpose

    if (!purpose || !ALLOWED_PURPOSE.includes(purpose)) {
      return NextResponse.json({ error: 'purpose must be vision or text' }, { status: 400 })
    }

    const resolved = await resolveApiKey(purpose, body)
    const model = await loadModel(purpose, body.model)

    if (!model) {
      return NextResponse.json({ error: 'Model is required for testing.' }, { status: 400 })
    }

    const provider = resolved.provider || 'openrouter'
    if (provider.toLowerCase() !== 'openrouter' && !resolved.endpointUrl) {
      return NextResponse.json(
        { error: 'Only OpenRouter or OpenAI-compatible custom endpoints can be tested right now.' },
        { status: 400 }
      )
    }

    const result = await callChatCompletion({
      purpose,
      apiKey: resolved.apiKey,
      endpointUrl: resolved.endpointUrl,
      model,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          purpose,
          provider,
          model: result.model || model,
          keySource: resolved.keySource,
          error: result.error,
          durationMs: result.durationMs,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      purpose,
      provider,
      model: result.model || model,
      keySource: resolved.keySource,
      durationMs: result.durationMs,
      sample: result.sample,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Provider test failed.',
      },
      { status: 500 }
    )
  }
}
