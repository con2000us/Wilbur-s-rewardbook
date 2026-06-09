import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import sharp from 'sharp'

const BUCKET_NAME = 'assessment-imports'
const STITCH_DIR = 'classify'

// ── v2 拼圖參數 ──
const CELL_WIDTH = 400
const CELL_HEIGHT = 400
const LABEL_BAR_HEIGHT = 24
const TITLE_BAR_HEIGHT = 20
const ROW_HEADER_HEIGHT = 28
const ROW_SEPARATOR_HEIGHT = 2
const DOUBLE_SEPARATOR_HEIGHT = 4
const MAX_TOTAL_WIDTH = 1600
const MAX_TOTAL_HEIGHT = 7500
const MIN_CELL_WIDTH = 250
const DEFAULT_MAX_TYPES_PER_SUBJECT = 3

const ROW_HEADER_COLOR = '#1a6e1a'
const NEW_ROW_HEADER_COLOR = '#cc0000'
const LABEL_BAR_COLOR = '#333333'
const TITLE_BAR_COLOR = '#666666'
const ROW_SEP_COLOR = '#cccccc'
const DOUBLE_SEP_COLOR = '#999999'

// ── 類型 ──
interface TemplatePaper {
  subject_name: string
  assessment_type: string
  title: string
  imageUrl: string
  paperIndex: number
}

interface RequestBody {
  student_id: string
  new_image_urls: string[]
  max_per_subject?: number
}

// ── 輔助函式 ──
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function svgRect(width: number, height: number, fill: string, rx = 0): string {
  return `<rect width="${width}" height="${height}" fill="${fill}"${rx ? ` rx="${rx}"` : ''}/>`
}

function svgText(
  x: number,
  y: number,
  text: string,
  fontSize: number,
  fill = 'white',
  fontWeight = 'bold',
): string {
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${escapeXml(text)}</text>`
}

function createRowHeaderSvg(text: string, bgColor: string, width: number): Buffer {
  const svg = `<svg width="${width}" height="${ROW_HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${svgRect(width, ROW_HEADER_HEIGHT, bgColor)}
    ${svgText(8, ROW_HEADER_HEIGHT / 2 + 5, text, 14)}
  </svg>`
  return Buffer.from(svg)
}

function createSeparatorSvg(width: number, height: number, color: string): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${svgRect(width, height, color)}
  </svg>`
  return Buffer.from(svg)
}

function createCellLabelSvg(text: string, width: number): Buffer {
  const svg = `<svg width="${width}" height="${LABEL_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${svgRect(width, LABEL_BAR_HEIGHT, LABEL_BAR_COLOR)}
    ${svgText(6, LABEL_BAR_HEIGHT / 2 + 4, text, 12)}
  </svg>`
  return Buffer.from(svg)
}

function createCellTitleSvg(text: string, width: number): Buffer {
  const truncated = text.length > 20 ? text.slice(0, 18) + '…' : text
  const svg = `<svg width="${width}" height="${TITLE_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${svgRect(width, TITLE_BAR_HEIGHT, TITLE_BAR_COLOR)}
    ${svgText(6, TITLE_BAR_HEIGHT / 2 + 4, `標題：${truncated}`, 10, '#ffffff', 'normal')}
  </svg>`
  return Buffer.from(svg)
}

function createPlaceholderSvg(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f0f0f0"/>
    <text x="${width / 2}" y="${height / 2 + 6}" font-family="sans-serif" font-size="14" fill="#999" text-anchor="middle">⚠ 圖片載入失敗</text>
  </svg>`
  return Buffer.from(svg)
}

function createCellBorderSvg(width: number, height: number, color: string, strokeWidth: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
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

async function renderCell(
  imageBuffer: Buffer | null,
  labelText: string,
  titleText: string,
  cellWidth: number,
  isNew: boolean,
): Promise<Buffer> {
  const imgAreaHeight = CELL_HEIGHT - LABEL_BAR_HEIGHT - TITLE_BAR_HEIGHT

  // 縮放考卷圖片
  let imgLayer: Buffer
  let imgW = cellWidth
  let imgH = imgAreaHeight

  if (imageBuffer) {
    const resized = await sharp(imageBuffer)
      .resize({ width: cellWidth, height: imgAreaHeight, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true })

    imgW = resized.info.width
    imgH = resized.info.height
    imgLayer = resized.data
  } else {
    imgLayer = createPlaceholderSvg(cellWidth, imgAreaHeight)
    imgW = cellWidth
    imgH = imgAreaHeight
  }

  const compos: sharp.OverlayOptions[] = []

  // 標籤列
  compos.push({ input: createCellLabelSvg(labelText, cellWidth), top: 0, left: 0 })

  // 圖片（置中）
  const imgLeft = Math.max(0, Math.floor((cellWidth - imgW) / 2))
  const imgTop = LABEL_BAR_HEIGHT + Math.max(0, Math.floor((imgAreaHeight - imgH) / 2))
  compos.push({ input: imgLayer, top: imgTop, left: imgLeft })

  // 標題列
  compos.push({
    input: createCellTitleSvg(titleText, cellWidth),
    top: CELL_HEIGHT - TITLE_BAR_HEIGHT,
    left: 0,
  })

  // 新考卷紅框
  if (isNew) {
    compos.push({ input: createCellBorderSvg(cellWidth, CELL_HEIGHT, NEW_ROW_HEADER_COLOR, 2), top: 0, left: 0 })
  }

  const cell = sharp({
    create: {
      width: cellWidth,
      height: CELL_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })

  return cell.composite(compos.map((c) => ({ ...c, blend: 'over' }))).png().toBuffer()
}

/**
 * POST /api/agent/classify-context
 *
 * v2: 科目分排網格佈局。每科目佔一排，該科目的各評量類型依序往右放。
 * 新考卷獨佔最後一排（紅底標題 + 紅框）。
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // ── 1. 解析請求 ──
    const body: RequestBody = await request.json()
    const { student_id, new_image_urls } = body
    const maxTypesPerSubject = body.max_per_subject || DEFAULT_MAX_TYPES_PER_SUBJECT

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }
    if (!new_image_urls || new_image_urls.length === 0) {
      return NextResponse.json({ error: 'new_image_urls must be a non-empty array' }, { status: 400 })
    }

    // ── 2. 驗證 student ──
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // ── 3. 查詢科目（依 display_order 排序） ──
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('student_id', student_id)
      .order('order_index', { ascending: true })

    const subjectList = (subjects || []).map((s) => ({ id: s.id, name: s.name }))
    const subjectIds = subjectList.map((s) => s.id)
    const subjectNameById = new Map(subjectList.map((s) => [s.id, s.name]))

    // ── 4. 查詢評估類型（依 display_order 排序） ──
    const { data: assessmentTypes } = await supabase
      .from('assessment_types')
      .select('type_key, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const typeOrder = new Map((assessmentTypes || []).map((t) => [t.type_key, t.display_order ?? 999]))

    // ── 5. 查詢範本考卷 ──
    const { data: templates } = await supabase
      .from('assessments')
      .select('id, subject_id, title, assessment_type, image_urls, created_at')
      .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })

    // ── 6. 分組: subject → type → [papers] ──
    //    subjectRows: 依 subject 排序
    //    每個 subject 內，依 type display_order 排序
    const subjectPaperMap = new Map<string, Map<string, TemplatePaper[]>>()

    for (const row of templates || []) {
      const imageUrls: any[] = Array.isArray(row.image_urls) ? row.image_urls : []
      if (imageUrls.length === 0) continue

      const subjectId = row.subject_id
      const subjectName = subjectNameById.get(subjectId) || 'Unknown'
      const typeKey = row.assessment_type || 'unknown'

      if (!subjectPaperMap.has(subjectId)) {
        subjectPaperMap.set(subjectId, new Map())
      }
      const typeMap = subjectPaperMap.get(subjectId)!

      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, [])
      }
      const papers = typeMap.get(typeKey)!

      if (papers.length >= 1) continue // 每類型只取最新 1 張

      papers.push({
        subject_name: subjectName,
        assessment_type: typeKey,
        title: row.title,
        imageUrl: imageUrls[0]?.url || '',
        paperIndex: 0, // 後續賦值
      })
    }

    // ── 過濾：只保留有範本的 subject ──
    const activeSubjects = subjectList.filter((s) => subjectPaperMap.has(s.id))

    // ── 計算每個 subject 的 type 列表（排序後） ──
    const subjectTypeKeys: { subjectId: string; typeKeys: string[] }[] = []
    let maxCols = 0

    for (const subj of activeSubjects) {
      const typeMap = subjectPaperMap.get(subj.id)!
      const sortedTypes = Array.from(typeMap.keys()).sort(
        (a, b) => (typeOrder.get(a) ?? 999) - (typeOrder.get(b) ?? 999),
      )
      // 限制每科目最多 maxTypesPerSubject 個類型
      const limited = sortedTypes.slice(0, maxTypesPerSubject)
      subjectTypeKeys.push({ subjectId: subj.id, typeKeys: limited })
      if (limited.length > maxCols) maxCols = limited.length
    }

    // 無範本 → 只繪待分類行
    const hasTemplates = activeSubjects.length > 0

    // ── 7. 計算佈局 ──
    let cellWidth = Math.floor(MAX_TOTAL_WIDTH / Math.max(maxCols, 1))
    if (cellWidth > CELL_WIDTH) cellWidth = CELL_WIDTH
    if (cellWidth < MIN_CELL_WIDTH) cellWidth = MIN_CELL_WIDTH

    const totalWidth = cellWidth * Math.max(maxCols, 1)

    // ── 8. 下載新考卷圖片 ──
    let newImageBuffer: Buffer
    try {
      newImageBuffer = await downloadImage(new_image_urls[0])
    } catch {
      return NextResponse.json(
        { error: `Failed to download new image: ${new_image_urls[0]}` },
        { status: 400 },
      )
    }

    // ── 9. 拼圖 ──
    const compos: sharp.OverlayOptions[] = []
    let currentY = 0
    let paperIndex = 0
    const paperMeta: { index: number; subject: string; type: string; isTemplate: boolean }[] = []

    for (const { subjectId, typeKeys } of subjectTypeKeys) {
      const subjectName = subjectNameById.get(subjectId) || 'Unknown'
      const typeMap = subjectPaperMap.get(subjectId)!

      // 科目行標題
      if (currentY + ROW_HEADER_HEIGHT > MAX_TOTAL_HEIGHT) break
      compos.push({
        input: createRowHeaderSvg(subjectName, ROW_HEADER_COLOR, totalWidth),
        top: currentY,
        left: 0,
      })
      currentY += ROW_HEADER_HEIGHT

      // 繪製每個 type 的格子
      let cellX = 0
      for (const typeKey of typeKeys) {
        const papers = typeMap.get(typeKey) || []
        const paper = papers[0]

        paperIndex++
        const cellLabel = `【第${paperIndex}張】${subjectName} · ${typeKey}`
        const cellTitle = paper?.title || ''

        let imgBuffer: Buffer | null = null
        if (paper) {
          try {
            imgBuffer = await downloadImage(paper.imageUrl)
          } catch {
            // 下載失敗 → 顯示佔位
          }
        }

        const cellBuffer = await renderCell(imgBuffer, cellLabel, cellTitle, cellWidth, false)
        compos.push({ input: cellBuffer, top: currentY, left: cellX })
        paperMeta.push({ index: paperIndex, subject: subjectName, type: typeKey, isTemplate: true })
        cellX += cellWidth
      }

      currentY += CELL_HEIGHT

      // 科目分隔線
      if (currentY + ROW_SEPARATOR_HEIGHT <= MAX_TOTAL_HEIGHT) {
        compos.push({
          input: createSeparatorSvg(totalWidth, ROW_SEPARATOR_HEIGHT, ROW_SEP_COLOR),
          top: currentY,
          left: 0,
        })
        currentY += ROW_SEPARATOR_HEIGHT
      }
    }

    // ── 10. 雙分隔線 ──
    if (hasTemplates && currentY + DOUBLE_SEPARATOR_HEIGHT <= MAX_TOTAL_HEIGHT) {
      compos.push({
        input: createSeparatorSvg(totalWidth, DOUBLE_SEPARATOR_HEIGHT, DOUBLE_SEP_COLOR),
        top: currentY,
        left: 0,
      })
      currentY += DOUBLE_SEPARATOR_HEIGHT
    }

    // ── 11. 待分類行 ──
    const newPaperIndex = paperIndex + 1
    if (currentY + ROW_HEADER_HEIGHT + CELL_HEIGHT <= MAX_TOTAL_HEIGHT) {
      // 紅底標題
      compos.push({
        input: createRowHeaderSvg('❓ 待分類', NEW_ROW_HEADER_COLOR, totalWidth),
        top: currentY,
        left: 0,
      })
      currentY += ROW_HEADER_HEIGHT

      // 新考卷格子
      const cellBuffer = await renderCell(
        newImageBuffer,
        `【第${newPaperIndex}張】❓ 待分類`,
        '',
        cellWidth,
        true,
      )
      compos.push({ input: cellBuffer, top: currentY, left: 0 })
      paperMeta.push({ index: newPaperIndex, subject: 'unknown', type: 'unknown', isTemplate: false })
      currentY += CELL_HEIGHT
    }

    // ── 12. 產生最終圖像 ──
    const finalHeight = Math.max(currentY, 100)

    const canvas = sharp({
      create: {
        width: totalWidth,
        height: finalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })

    const stitchedBuffer = await canvas
      .composite(compos.map((c) => ({ ...c, blend: 'over' })))
      .png({ quality: 90 })
      .toBuffer()

    // ── 13. 上傳 ──
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

    // ── 14. 生成 vision prompt ──
    let prompt: string
    if (!hasTemplates) {
      prompt =
        '這是一張考卷圖片。無範本可供參考。\n\n請根據這張考卷的題型內容、排版格式、文字關鍵字來判斷科目。\n\n規則：\n- 仔細看題目文字來判斷科目（例如：出現計算/時鐘/圖形→數學，出現拼音/閱讀/造句→國語）\n- 只回答科目名稱，不要其他說明'
    } else {
      const subjectNames = activeSubjects.map((s) => s.name).join('、')
      prompt =
        '這是一張考卷分類對照圖。每種科目佔一排，科目名稱在左側綠色標題列。\n' +
        `每個科目下方依評量類型排列範本考卷，每張考卷頂部有【第N張】標記。\n` +
        `已知科目：${subjectNames}。\n` +
        `最後一排（紅底）是新考卷，標示「❓待分類」。\n\n` +
        '請根據新考卷的題型內容、排版格式、文字關鍵字，與上方各科目的範本比對，\n' +
        '判斷新考卷最可能屬於哪個科目。\n\n' +
        '規則：\n' +
        '- 不要用「已知科目有X種所以新的一定是第X+1種」的排除法\n' +
        '- 仔細看題目文字來判斷（例如：出現計算/時鐘/圖形→數學，出現拼音/閱讀/造句→國語）\n' +
        '- 只回答科目名稱，不要其他說明'
    }

    // ── 15. 整理 reference_papers ──
    const referencePapers = paperMeta
      .filter((m) => m.isTemplate)
      .map((m) => ({
        subject_name: m.subject,
        assessment_type: m.type,
        title: '', // 不記錄標題（簡化）
      }))

    return NextResponse.json({
      success: true,
      stitched_image_url: urlData?.publicUrl || '',
      vision_prompt: prompt,
      reference_papers: referencePapers,
      new_paper_index: newPaperIndex,
      total_papers: paperMeta.length,
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
