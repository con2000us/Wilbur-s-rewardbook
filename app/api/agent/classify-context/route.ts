import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import sharp from 'sharp'

const BUCKET_NAME = 'assessment-imports'
const STITCH_DIR = 'classify'
const IMG_WIDTH = 500
const LABEL_HEIGHT = 36
const SEPARATOR_HEIGHT = 4
const TEMPLATE_COLOR = '#1a6e1a'
const NEW_PAPER_COLOR = '#cc0000'
const MAX_TOTAL_HEIGHT = 8000
const DEFAULT_MAX_PER_SUBJECT = 2

// ── 類型定義 ──
interface TemplatePaper {
  subject_name: string
  assessment_type: string
  title: string
  imageUrl: string
}

interface RequestBody {
  student_id: string
  new_image_urls: string[]
  max_per_subject?: number
}

function createLabelSvg(text: string, bgColor: string, width: number): Buffer {
  const svg = `<svg width="${width}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${LABEL_HEIGHT}" fill="${bgColor}" rx="2"/>
    <text x="8" y="${LABEL_HEIGHT / 2 + 6}" font-family="sans-serif" font-size="16" font-weight="bold" fill="white">${escapeXml(text)}</text>
  </svg>`
  return Buffer.from(svg)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createSeparatorSvg(width: number): Buffer {
  const svg = `<svg width="${width}" height="${SEPARATOR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${SEPARATOR_HEIGHT}" fill="#cccccc"/>
  </svg>`
  return Buffer.from(svg)
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url} (HTTP ${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function processImage(input: Buffer): Promise<sharp.Sharp> {
  return sharp(input)
    .resize({ width: IMG_WIDTH, withoutEnlargement: true })
    .png()
}

/**
 * POST /api/agent/classify-context
 *
 * 統合型考卷分類端點：agent 一次呼叫即取得拼好的分類圖 + vision prompt + metadata。
 *
 * Request:
 * {
 *   student_id: string,
 *   new_image_urls: string[],
 *   max_per_subject?: number (default 2)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   stitched_image_url: string,
 *   vision_prompt: string,
 *   reference_papers: TemplatePaper[],
 *   new_paper_index: number,
 *   total_papers: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // ── 1. 解析請求 ──
    const body: RequestBody = await request.json()
    const { student_id, new_image_urls } = body
    const maxPerSubject = body.max_per_subject || DEFAULT_MAX_PER_SUBJECT

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }
    if (!new_image_urls || new_image_urls.length === 0) {
      return NextResponse.json({ error: 'new_image_urls must be a non-empty array' }, { status: 400 })
    }

    // ── 2. 驗證 student_id 存在 ──
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // ── 3. 查詢範本考卷 ──
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('student_id', student_id)

    const subjectIds = (subjects || []).map((s) => s.id)
    const subjectNameMap = new Map<string, string>()

    if (subjectIds.length > 0) {
      const { data: subjectRows } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds)

      ;(subjectRows || []).forEach((s) => (subjectNameMap.set(s.id, s.name)))
    }

    const { data: templates } = await supabase
      .from('assessments')
      .select('id, subject_id, title, assessment_type, image_urls, created_at')
      .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })

    // ── 4. 分組：每 (subject_name, assessment_type) 取最新 N 筆 ──
    const groupMap = new Map<string, TemplatePaper[]>()
    const referencePapers: TemplatePaper[] = []

    for (const row of templates || []) {
      const imageUrls: any[] = Array.isArray(row.image_urls) ? row.image_urls : []
      if (imageUrls.length === 0) continue

      const subjectName = subjectNameMap.get(row.subject_id) || 'Unknown'
      const groupKey = `${subjectName}::${row.assessment_type || 'unknown'}`
      const group = groupMap.get(groupKey) || []

      if (group.length >= maxPerSubject) continue

      const paper: TemplatePaper = {
        subject_name: subjectName,
        assessment_type: row.assessment_type || 'unknown',
        title: row.title,
        imageUrl: imageUrls[0]?.url || '',
      }

      if (!paper.imageUrl) continue

      group.push(paper)
      groupMap.set(groupKey, group)
      referencePapers.push(paper)
    }

    // ── 5. 下載所有圖片 ──
    const downloads: { buffer: Buffer; isTemplate: boolean; paper: TemplatePaper | null }[] = []

    for (const paper of referencePapers) {
      try {
        const buffer = await downloadImage(paper.imageUrl)
        downloads.push({ buffer, isTemplate: true, paper })
      } catch {
        // 跳過無法下載的範本
        console.warn('Skipping template image download failure:', paper.imageUrl)
      }
    }

    // 新考卷取第一張
    const newImageUrl = new_image_urls[0]
    let newImageBuffer: Buffer
    try {
      newImageBuffer = await downloadImage(newImageUrl)
    } catch {
      return NextResponse.json(
        { error: `Failed to download new image: ${newImageUrl}` },
        { status: 400 },
      )
    }

    // ── 6. 拼圖 ──
    const stitchParts: sharp.OverlayOptions[] = []
    let currentY = 0
    let paperIndex = 0

    for (const dl of downloads) {
      paperIndex++
      const labelText = `【第${paperIndex}張】${dl.paper!.subject_name}·${dl.paper!.assessment_type}`
      const labelSvg = createLabelSvg(labelText, TEMPLATE_COLOR, IMG_WIDTH)
      const separator = createSeparatorSvg(IMG_WIDTH)

      const resized = await processImage(dl.buffer)
      const resizedMeta = await resized.metadata()
      const imgHeight = resizedMeta.height || 0

      if (currentY + LABEL_HEIGHT + imgHeight + SEPARATOR_HEIGHT > MAX_TOTAL_HEIGHT) break

      stitchParts.push({ input: labelSvg, top: currentY, left: 0 })
      currentY += LABEL_HEIGHT

      const { data: imgData, info: imgInfo } = await resized.toBuffer({ resolveWithObject: true })
      stitchParts.push({ input: imgData, top: currentY, left: 0 })
      currentY += imgInfo.height

      stitchParts.push({ input: separator, top: currentY, left: 0 })
      currentY += SEPARATOR_HEIGHT
    }

    const newPaperIndex = paperIndex + 1

    // 新考卷
    {
      const labelSvg = createLabelSvg(`【第${newPaperIndex}張】？？？  ← 待分類`, NEW_PAPER_COLOR, IMG_WIDTH)
      const resized = await processImage(newImageBuffer)
      const resizedMeta = await resized.metadata()
      const imgHeight = resizedMeta.height || 0

      if (currentY + LABEL_HEIGHT + imgHeight <= MAX_TOTAL_HEIGHT) {
        stitchParts.push({ input: labelSvg, top: currentY, left: 0 })
        currentY += LABEL_HEIGHT

        const { data: imgData, info: imgInfo } = await resized.toBuffer({ resolveWithObject: true })
        stitchParts.push({ input: imgData, top: currentY, left: 0 })
        currentY += imgInfo.height
      }
    }

    // 若無任何範本，只拼新考卷並改 prompt
    const hasTemplates = downloads.length > 0

    // 產生拼圖
    const canvas = sharp({
      create: {
        width: IMG_WIDTH,
        height: Math.max(currentY, 100),
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })

    const stitchedBuffer = await canvas
      .composite(stitchParts.map((p) => ({ ...p, blend: 'over' })))
      .png({ quality: 88 })
      .toBuffer()

    // ── 7. 上傳拼圖 ──
    const adminClient = createAdminClient()
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')
    const filePath = `${STITCH_DIR}/${timestamp}.png`

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, stitchedBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload stitched image: ' + uploadError.message },
        { status: 500 },
      )
    }

    const { data: urlData } = adminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    const stitchedImageUrl = urlData?.publicUrl || ''

    // ── 8. 生成 vision prompt ──
    const totalPapers = newPaperIndex

    let prompt: string
    if (!hasTemplates) {
      prompt =
        '這張圖有1張考卷，它是新的考卷。\n\n請根據這張考卷的題型內容、排版格式、文字關鍵字來判斷科目。\n\n規則：\n- 仔細看題目文字來判斷科目\n- 只回答科目名稱，不要其他說明'
    } else {
      const templateLines = downloads.map(
        (dl, i) => `第${i + 1}張是已知的 ${dl.paper!.subject_name}·${dl.paper!.assessment_type} 考卷。`,
      )
      prompt =
        `這張圖有${totalPapers}張考卷，每張頂部有標籤【第N張】。\n\n` +
        templateLines.join('\n') +
        `\n第${newPaperIndex}張是新的考卷（標示「？？？」），請根據它的題型內容、排版格式、文字關鍵字來判斷科目。\n\n` +
        '規則：\n- 不要用「已知科目有X種所以新的一定是第X+1種」的排除法\n- 仔細看第' +
        newPaperIndex +
        '張的題目文字來判斷\n- 只回答科目名稱，不要其他說明'
    }

    return NextResponse.json({
      success: true,
      stitched_image_url: stitchedImageUrl,
      vision_prompt: prompt,
      reference_papers: referencePapers,
      new_paper_index: newPaperIndex,
      total_papers: totalPapers,
    })
  } catch (error) {
    console.error('Classify context error:', error)
    return NextResponse.json(
      {
        error:
          'Failed to build classify context: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 },
    )
  }
}
