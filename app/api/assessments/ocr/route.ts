import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { decrypt, getEncryptionSecret } from '@/lib/crypto/encryption'
import { toServerPublicStorageUrl } from '@/lib/storage/publicUrl'

// ── OCR Prompt (from direct-ocr.py) ──────────────────────────────

const VISION_PROMPT = `請看這張考卷照片，按以下欄位填空。只看照片中的文字，不編造。
找不到的留空，不要填「無」。

科目_標題區：{考卷標題區寫的科目，如國語、數學}
科目_內文判斷：{從題目內容判斷，中文→國語，計算→數學，英文→英文}
總分_標題區：{老師手寫批改的總分，數字如95 或等第如A、B+、C-。圈起來的或「總分」旁的}
等第_標題區：{若總分是等第制（A/B/C/D/F，可含+-），填這裡；數字分數則留空}
總分_小計：{各題型得分，如「選擇題10/10, 填空題8/10」}
標題_標題區：{考試名稱，如第二次期中考、第5課小考}
類型_關鍵字：{期中考→exam, 小考→quiz, 作業→homework, 報告→project}
評分模式_有無總分：{有數字總分或等第填 scored，完全找不到任何分數或等第填 record_only}
滿分_考卷標示：{考卷上的滿分，如120。沒寫就填100}
日期_考卷標示：{考卷上的日期}

只輸出上述格式，一行一個欄位，不要其他文字。`

// ── Types ────────────────────────────────────────────────────────

interface OcrRequestBody {
  assessment_id: string
  image_index?: number
}

interface OcrFields {
  subject_header: string
  subject_content: string
  total_score: string
  grade: string
  score_breakdown: string
  title: string
  assessment_type: string
  scoring_mode: string
  max_score: string
  date: string
}

interface ProviderConfigRow {
  provider: string
  purpose: string
  endpoint_url: string | null
  encrypted_api_key: string
}

// ── Parsing ──────────────────────────────────────────────────────

function parseOcr(text: string): OcrFields {
  const fields: Record<string, string> = {}

  const keyMap: Record<string, string> = {
    '科目_標題區': 'subject_header',
    '科目_內文判斷': 'subject_content',
    '總分_標題區': 'total_score',
    '等第_標題區': 'grade',
    '總分_小計': 'score_breakdown',
    '標題_標題區': 'title',
    '類型_關鍵字': 'assessment_type',
    '評分模式_有無總分': 'scoring_mode',
    '滿分_考卷標示': 'max_score',
    '日期_考卷標示': 'date',
  }

  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const sepIdx = trimmed.indexOf('：')
    if (sepIdx === -1) continue

    const key = trimmed.substring(0, sepIdx).trim()
    const value = trimmed.substring(sepIdx + 1).trim()

    const mappedKey = keyMap[key]
    if (mappedKey) {
      fields[mappedKey] = value
    }
  }

  return {
    subject_header: fields.subject_header || '',
    subject_content: fields.subject_content || '',
    total_score: fields.total_score || '',
    grade: fields.grade || '',
    score_breakdown: fields.score_breakdown || '',
    title: fields.title || '',
    assessment_type: fields.assessment_type || '',
    scoring_mode: fields.scoring_mode || '',
    max_score: fields.max_score || '',
    date: fields.date || '',
  }
}

// ── Formatting ───────────────────────────────────────────────────

function formatOcrContent(fields: OcrFields): string {
  const labelMap: Record<string, string> = {
    subject_header: '科目(標題區)',
    subject_content: '科目(內文判斷)',
    total_score: '總分',
    grade: '等第',
    score_breakdown: '小計',
    title: '考試名稱',
    assessment_type: '類型',
    scoring_mode: '評分模式',
    max_score: '滿分',
    date: '日期',
  }

  const parts: string[] = []

  for (const [key, label] of Object.entries(labelMap)) {
    const value = fields[key as keyof OcrFields]
    if (value) {
      parts.push(`${label}: ${value}`)
    }
  }

  return parts.join(' | ')
}

// ── Vision API call ──────────────────────────────────────────────

function normalizeBaseUrl(endpointUrl?: string | null): string {
  const raw = (endpointUrl || 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '')
  return raw || 'https://openrouter.ai/api/v1'
}

async function callVisionApi(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  endpointUrl: string | null,
  model: string,
): Promise<string> {
  const baseUrl = normalizeBaseUrl(endpointUrl)
  const url = `${baseUrl}/chat/completions`

  const dataUrl = `data:${mimeType};base64,${imageBase64}`

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 3000,
    temperature: 0,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(
        `Vision API returned ${response.status}: ${responseText.slice(0, 500)}`
      )
    }

    let data: { choices?: Array<{ message?: { content?: unknown } }> }
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('Vision API returned non-JSON response')
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Vision API returned empty response')
    }

    return typeof content === 'string' ? content : JSON.stringify(content)
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Route Handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OcrRequestBody
    const { assessment_id, image_index = 0 } = body

    if (!assessment_id) {
      return NextResponse.json(
        { error: 'assessment_id is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Read assessment from DB
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select('id, image_urls')
      .eq('id', assessment_id)
      .single()

    if (assessError || !assessment) {
      if (assessError) {
        console.error('OCR assessment lookup failed:', assessError)
      }
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const imageUrls =
      (assessment.image_urls as Array<{ url: string }>) || []
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Assessment has no images' },
        { status: 400 }
      )
    }

    if (image_index >= imageUrls.length) {
      return NextResponse.json(
        {
          error: `image_index ${image_index} out of range (0-${imageUrls.length - 1})`,
        },
        { status: 400 }
      )
    }

    const imageUrl = toServerPublicStorageUrl(imageUrls[image_index].url)

    // 2. Read active provider config (first active one)
    const { data: providerConfigs } = await supabase
      .from('ai_provider_configs')
      .select('provider, purpose, endpoint_url, encrypted_api_key')
      .eq('is_active', true)
      .limit(1)

    if (!providerConfigs || providerConfigs.length === 0) {
      return NextResponse.json(
        { error: 'No AI provider configured. Please set up a provider in AI settings.' },
        { status: 400 }
      )
    }

    const typedConfigs = providerConfigs as ProviderConfigRow[]
    const providerConfig = typedConfigs[0]

    // Decrypt API key
    let apiKey: string
    try {
      const secret = getEncryptionSecret()
      apiKey = decrypt(providerConfig.encrypted_api_key, secret)
    } catch {
      return NextResponse.json(
        { error: 'Failed to decrypt API key. Check your encryption secret.' },
        { status: 500 }
      )
    }

    // 3. Read model name from site settings
    const { data: modelSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'ai_assessment_model_vision')
      .single()

    const model = modelSetting?.value || 'qwen3.6-flash'

    // 3. Download and encode the image
    let imageBase64: string
    let mimeType: string
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(30000),
      })
      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download image: ${imageResponse.status}` },
          { status: 500 }
        )
      }

      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      mimeType = contentType.split(';')[0].trim()

      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      imageBase64 = buffer.toString('base64')
    } catch (err) {
      return NextResponse.json(
        {
          error: `Failed to download image: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        { status: 500 }
      )
    }

    // 4. Call vision API
    let ocrText: string
    try {
      ocrText = await callVisionApi(
        imageBase64,
        mimeType,
        apiKey,
        providerConfig.endpoint_url,
        model,
      )
    } catch (err) {
      return NextResponse.json(
        {
          error: `Vision API call failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          success: false,
        },
        { status: 502 }
      )
    }

    // 5. Parse OCR response
    const fields = parseOcr(ocrText)

    // 6. Format the dedicated OCR content
    const ocrContent = formatOcrContent(fields)

    // 7. Write to DB
    const { error: updateError } = await supabase
      .from('assessments')
      .update({ ocr_content: ocrContent })
      .eq('id', assessment_id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save OCR content: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fields,
      ocr_content: ocrContent,
      raw_ocr_text: ocrText,
    })
  } catch (error) {
    console.error('OCR endpoint error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false,
      },
      { status: 500 }
    )
  }
}
