import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import sharp from 'sharp'

const BUCKET_NAME = 'assessment-imports'
const STITCH_DIR = 'classify'

// ── v3.1 混合尺寸佈局：新卷大圖 + 範本小圖 ──
const NEW_CELL_MIN_WIDTH = 1600         // 新卷最小寬度（保證文字可讀）
const NEW_CELL_MIN_HEIGHT = 1200        // 新卷最小高度（保證分數區可見）
const NEW_CELL_MAX_WIDTH = 2800         // 新卷最大寬度（不超過 vision 限制）
const NEW_CELL_MAX_HEIGHT = 2400        // 新卷最大高度
const TEMPLATE_CELL_WIDTH = 600         // 範本格寬度
const TEMPLATE_CELL_HEIGHT = 600        // 範本格高度
const LABEL_BAR_HEIGHT = 24
const TITLE_BAR_HEIGHT = 20
const ROW_HEADER_HEIGHT = 28
const ROW_SEPARATOR_HEIGHT = 2
const DOUBLE_SEPARATOR_HEIGHT = 4
const MAX_TOTAL_WIDTH = 4000
const MAX_TOTAL_HEIGHT = 7500
const PAPER_LIMIT = 40

const ROW_HEADER_COLOR = '#1a6e1a'
const NEW_ROW_HEADER_COLOR = '#cc0000'
const LABEL_BAR_COLOR = '#333333'
const TITLE_BAR_COLOR = '#666666'
const ROW_SEP_COLOR = '#cccccc'
const DOUBLE_SEP_COLOR = '#999999'

// ── 內網直連（避免走外網 CDN）──
const INTERNAL_STORAGE_BASE = 'http://192.168.100.112:8043/storage/v1/object/public'

// ── 類型 ──
interface TemplatePaper {
  subject_id: string
  subject_name: string
  assessment_type: string
  title: string
  imageUrl: string
}

interface SelectedPaper {
  subject_name: string
  assessment_type: string
  title: string
  imageUrl: string
  index: number
}

interface RequestBody {
  student_id: string
  new_image_urls: string[]
  max_papers?: number
}

// ── SVG 輔助 ──
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function svgRect(w: number, h: number, fill: string): string {
  return `<rect width="${w}" height="${h}" fill="${fill}"/>`
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

function createRowHeader(text: string, bgColor: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${ROW_HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${svgRect(width, ROW_HEADER_HEIGHT, bgColor)}
      ${svgText(8, ROW_HEADER_HEIGHT / 2 + 5, text, 14)}
    </svg>`,
  )
}

function createSeparator(width: number, height: number, color: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgRect(width, height, color)}
    </svg>`,
  )
}

function createCellLabel(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${LABEL_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${svgRect(width, LABEL_BAR_HEIGHT, LABEL_BAR_COLOR)}
      ${svgText(6, LABEL_BAR_HEIGHT / 2 + 4, text, 12)}
    </svg>`,
  )
}

function createCellTitle(text: string, width: number): Buffer {
  const truncated = text.length > 20 ? text.slice(0, 18) + '…' : text
  return Buffer.from(
    `<svg width="${width}" height="${TITLE_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${svgRect(width, TITLE_BAR_HEIGHT, TITLE_BAR_COLOR)}
      ${svgText(6, TITLE_BAR_HEIGHT / 2 + 4, `標題：${truncated}`, 10, '#ffffff', 'normal')}
    </svg>`,
  )
}

function createPlaceholder(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f0f0f0"/>
      <text x="${width / 2}" y="${height / 2 + 6}" font-family="sans-serif" font-size="14" fill="#999" text-anchor="middle">⚠ 圖片載入失敗</text>
    </svg>`,
  )
}

function createCellBorder(width: number, height: number, color: string, strokeWidth: number): Buffer {
  const s = strokeWidth / 2
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${s}" y="${s}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
    </svg>`,
  )
}

// ── 圖片下載（轉內網 URL）──
function toInternalUrl(publicUrl: string): string {
  if (!publicUrl) return publicUrl
  // 將外網 URL 轉為內網直連
  return publicUrl.replace(
    /https?:\/\/mayacraft\.net\/supabase\/storage\/v1\/object\/public/,
    INTERNAL_STORAGE_BASE,
  )
}

async function downloadImage(url: string): Promise<Buffer> {
  const internalUrl = toInternalUrl(url)
  const response = await fetch(internalUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${internalUrl} (HTTP ${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}

// ── 繪製單格 ──
async function renderCell(
  imageBuffer: Buffer | null,
  labelText: string,
  titleText: string,
  isNew: boolean,
  cellWidth: number,
  cellHeight: number,
): Promise<Buffer> {
  const imgAreaHeight = cellHeight - LABEL_BAR_HEIGHT - TITLE_BAR_HEIGHT

  let imgLayer: Buffer
  let imgW = cellWidth
  let imgH = imgAreaHeight

  if (imageBuffer) {
    const resizeOpts: sharp.ResizeOptions = {
      width: cellWidth,
      height: imgAreaHeight,
      fit: 'inside',
      withoutEnlargement: !isNew, // 新卷允許放大到格子
    }
    const resized = await sharp(imageBuffer)
      .resize(resizeOpts)
      .png()
      .toBuffer({ resolveWithObject: true })
    imgW = resized.info.width
    imgH = resized.info.height
    imgLayer = resized.data
  } else {
    imgLayer = createPlaceholder(cellWidth, imgAreaHeight)
    imgW = cellWidth
    imgH = imgAreaHeight
  }

  const compos: sharp.OverlayOptions[] = [
    { input: createCellLabel(labelText, cellWidth), top: 0, left: 0 },
    {
      input: imgLayer,
      top: LABEL_BAR_HEIGHT + Math.max(0, Math.floor((imgAreaHeight - imgH) / 2)),
      left: Math.max(0, Math.floor((cellWidth - imgW) / 2)),
    },
    { input: createCellTitle(titleText, cellWidth), top: cellHeight - TITLE_BAR_HEIGHT, left: 0 },
  ]

  if (isNew) {
    compos.push({ input: createCellBorder(cellWidth, cellHeight, NEW_ROW_HEADER_COLOR, 2), top: 0, left: 0 })
  }

  return sharp({
    create: { width: cellWidth, height: cellHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite(compos.map((c) => ({ ...c, blend: 'over' })))
    .png()
    .toBuffer()
}

/**
 * POST /api/agent/classify-context
 *
 * v3: 輪次選取（Round 1 各取最新 → Round 2 取第二新 → …），上限 40 張。
 * 科目分排網格，同科目內各類型水平排列，同類型多張垂直堆疊。
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // ── 1. 解析 ──
    const body: RequestBody = await request.json()
    const { student_id, new_image_urls } = body
    const totalLimit = body.max_papers || PAPER_LIMIT

    if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    if (!new_image_urls?.length) return NextResponse.json({ error: 'new_image_urls required' }, { status: 400 })

    // ── 2. 驗證 student ──
    const { data: student, error: se } = await supabase.from('students').select('id').eq('id', student_id).single()
    if (se || !student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // ── 3. 查科目 ──
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('student_id', student_id)
      .order('order_index', { ascending: true })
    const subjectList = (subjects || []).map((s) => ({ id: s.id, name: s.name }))
    const subjectIds = subjectList.map((s) => s.id)
    const nameById = new Map(subjectList.map((s) => [s.id, s.name]))

    // ── 4. 查評量類型順序 ──
    const { data: atRows } = await supabase
      .from('assessment_types')
      .select('type_key, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    const typeOrder = new Map((atRows || []).map((t) => [t.type_key, t.display_order ?? 999]))

    // ── 5. 查所有附圖評量（依 created_at DESC）──
    const { data: templates } = await supabase
      .from('assessments')
      .select('id, subject_id, title, assessment_type, image_urls, created_at')
      .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })

    // ── 6. 建立 (subject, type) → [papers] 索引 ──
    const paperPool = new Map<string, TemplatePaper[]>()
    for (const row of templates || []) {
      const urls: any[] = Array.isArray(row.image_urls) ? row.image_urls : []
      if (!urls.length) continue

      const subjId = row.subject_id
      const typeKey = row.assessment_type || 'unknown'
      const key = `${subjId}::${typeKey}`

      if (!paperPool.has(key)) paperPool.set(key, [])
      paperPool.get(key)!.push({
        subject_id: subjId,
        subject_name: nameById.get(subjId) || 'Unknown',
        assessment_type: typeKey,
        title: row.title,
        imageUrl: (urls as any[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.url || '',
      })
    }

    // ── 7. 輪次選取 ──
    const activeSubjects = subjectList.filter((s) => {
      for (const t of typeOrder.keys()) {
        if (paperPool.has(`${s.id}::${t}`)) return true
      }
      return false
    })

    // 建立有序的 (subject, type) 組合列表
    const orderedCombos: { subjectId: string; typeKey: string }[] = []
    for (const subj of activeSubjects) {
      const typeKeys = Array.from(typeOrder.keys()).filter((tk) =>
        paperPool.has(`${subj.id}::${tk}`),
      )
      for (const tk of typeKeys) {
        orderedCombos.push({ subjectId: subj.id, typeKey: tk })
      }
    }

    // 輪次選取：Round 1 各取 [0], Round 2 各取 [1], ...
    const selected: SelectedPaper[] = []
    const usedSet = new Set<string>()
    const maxTemplates = totalLimit - 1 // 留 1 格給新考卷
    let round = 0

    while (selected.length < maxTemplates) {
      let addedThisRound = false
      for (const { subjectId, typeKey } of orderedCombos) {
        if (selected.length >= maxTemplates) break
        const pool = paperPool.get(`${subjectId}::${typeKey}`) || []
        const paper = pool[round]
        if (!paper) continue

        const dedupeKey = `${paper.subject_id}|${paper.assessment_type}|${paper.title}|${paper.imageUrl}`
        if (usedSet.has(dedupeKey)) continue
        usedSet.add(dedupeKey)

        selected.push({
          subject_name: paper.subject_name,
          assessment_type: paper.assessment_type,
          title: paper.title,
          imageUrl: paper.imageUrl,
          index: selected.length + 1,
        })
        addedThisRound = true
      }
      if (!addedThisRound) break
      round++
    }

    const hasTemplates = selected.length > 0

    // ── 8. 按 subject 分組，計算每科目佔用寬度與列數 ──
    interface SubjectGroup {
      subjectId: string
      subjectName: string
      types: { typeKey: string; papers: SelectedPaper[] }[]
    }

    const subjectGroups: SubjectGroup[] = []
    for (const subj of activeSubjects) {
      const typeMap = new Map<string, SelectedPaper[]>()
      for (const p of selected) {
        const subjName = nameById.get(subj.id) || 'Unknown'
        if (p.subject_name !== subjName) continue

        if (!typeMap.has(p.assessment_type)) typeMap.set(p.assessment_type, [])
        typeMap.get(p.assessment_type)!.push(p)
      }
      if (typeMap.size === 0) continue

      const sortedTypes = Array.from(typeMap.entries()).sort(
        (a, b) => (typeOrder.get(a[0]) ?? 999) - (typeOrder.get(b[0]) ?? 999),
      )

      subjectGroups.push({
        subjectId: subj.id,
        subjectName: subj.name,
        types: sortedTypes.map(([tk, papers]) => ({ typeKey: tk, papers })),
      })
    }

    // ── 9. 計算佈局（混合尺寸）──
    const maxTypesInAnySubject = Math.max(1, ...subjectGroups.map((g) => g.types.length))
    // 範本格寬度：基於科目類型數動態計算
    let templateCellWidth = TEMPLATE_CELL_WIDTH
    if (maxTypesInAnySubject > 1) {
      templateCellWidth = Math.min(TEMPLATE_CELL_WIDTH, Math.floor(MAX_TOTAL_WIDTH / maxTypesInAnySubject))
    }
    // 新考卷寬度：撐滿全寬，但限制上限
    const newCellWidth = Math.min(NEW_CELL_MAX_WIDTH, Math.max(NEW_CELL_MIN_WIDTH, MAX_TOTAL_WIDTH))
    // 新考卷高度
    const newCellHeight = Math.min(NEW_CELL_MAX_HEIGHT, Math.max(NEW_CELL_MIN_HEIGHT, 1600))
    // 總寬 = max(範本區總寬, 新卷寬)
    const totalWidth = Math.max(
      templateCellWidth * maxTypesInAnySubject,
      newCellWidth,
    )

    // ── 10. 下載新考卷 ──
    let newImageBuffer: Buffer
    try {
      newImageBuffer = await downloadImage(new_image_urls[0])
    } catch {
      return NextResponse.json({ error: `Failed to download new image: ${new_image_urls[0]}` }, { status: 400 })
    }

    // ── 11. 拼圖（同科目內類型水平、同類型多張垂直堆疊）──
    const compos: sharp.OverlayOptions[] = []
    let currentY = 0

    for (const group of subjectGroups) {
      // 科目標題
      if (currentY + ROW_HEADER_HEIGHT > MAX_TOTAL_HEIGHT) break
      compos.push({
        input: createRowHeader(group.subjectName, ROW_HEADER_COLOR, totalWidth),
        top: currentY,
        left: 0,
      })
      currentY += ROW_HEADER_HEIGHT

      // 計算此科目列的最大格數（垂直方向）
      const maxPapersThisSubject = Math.max(1, ...group.types.map((t) => t.papers.length))
      const subjectRowHeight = maxPapersThisSubject * TEMPLATE_CELL_HEIGHT

      if (currentY + subjectRowHeight > MAX_TOTAL_HEIGHT) break

      // 繪製每個類型的格子（水平排列），同類型多張垂直堆疊
      let colX = 0
      for (const { papers } of group.types) {
        for (let pi = 0; pi < papers.length; pi++) {
          const paper = papers[pi]
          const label = `【第${paper.index}張】${paper.subject_name} · ${paper.assessment_type}${papers.length > 1 ? ` #${pi + 1}` : ''}`
          let imgBuffer: Buffer | null = null
          try {
            imgBuffer = await downloadImage(paper.imageUrl)
          } catch { /* 佔位 */ }

          const cellBuf = await renderCell(imgBuffer, label, paper.title, false, templateCellWidth, TEMPLATE_CELL_HEIGHT)
          compos.push({ input: cellBuf, top: currentY + pi * TEMPLATE_CELL_HEIGHT, left: colX })
        }
        colX += templateCellWidth
      }

      currentY += subjectRowHeight

      // 分隔線
      if (currentY + ROW_SEPARATOR_HEIGHT <= MAX_TOTAL_HEIGHT) {
        compos.push({ input: createSeparator(totalWidth, ROW_SEPARATOR_HEIGHT, ROW_SEP_COLOR), top: currentY, left: 0 })
        currentY += ROW_SEPARATOR_HEIGHT
      }
    }

    // ── 12. 雙分隔 + 待分類大圖 ──
    if (hasTemplates && currentY + DOUBLE_SEPARATOR_HEIGHT <= MAX_TOTAL_HEIGHT) {
      compos.push({ input: createSeparator(totalWidth, DOUBLE_SEPARATOR_HEIGHT, DOUBLE_SEP_COLOR), top: currentY, left: 0 })
      currentY += DOUBLE_SEPARATOR_HEIGHT
    }

    const newIndex = selected.length + 1
    if (currentY + ROW_HEADER_HEIGHT + newCellHeight <= MAX_TOTAL_HEIGHT) {
      compos.push({ input: createRowHeader('❓ 待分類', NEW_ROW_HEADER_COLOR, totalWidth), top: currentY, left: 0 })
      currentY += ROW_HEADER_HEIGHT
      const cellBuf = await renderCell(newImageBuffer, `【第${newIndex}張】❓ 待分類`, '', true, newCellWidth, newCellHeight)
      compos.push({ input: cellBuf, top: currentY, left: 0 })
      currentY += newCellHeight
    }

    // ── 13. 產生最終圖像 ──
    const finalHeight = Math.max(currentY, 100)
    const stitchedBuffer = await sharp({
      create: { width: totalWidth, height: finalHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite(compos.map((c) => ({ ...c, blend: 'over' })))
      .png({ quality: 90 })
      .toBuffer()

    // ── 13b. 清理舊拼圖（保留最近 10 分鐘的）──
    const adminClient = createAdminClient()
    const now = Date.now()
    const MAX_AGE_MS = 10 * 60 * 1000 // 10 分鐘
    try {
      const { data: existingFiles, error: listErr } = await adminClient.storage
        .from(BUCKET_NAME)
        .list(STITCH_DIR, { sortBy: { column: 'created_at', order: 'desc' } })
      if (!listErr && existingFiles) {
        for (const f of existingFiles) {
          const created = f.created_at ? new Date(f.created_at).getTime() : 0
          if (now - created > MAX_AGE_MS) {
            await adminClient.storage.from(BUCKET_NAME).remove([`${STITCH_DIR}/${f.name}`])
          }
        }
      }
    } catch { /* 清理失敗不影響主流程 */ }

    // ── 14. 上傳 ──
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_')
    const filePath = `${STITCH_DIR}/${ts}.png`

    const { error: ue } = await adminClient.storage.from(BUCKET_NAME).upload(filePath, stitchedBuffer, {
      contentType: 'image/png',
      upsert: true,
    })
    if (ue) {
      return NextResponse.json({ error: 'Upload failed: ' + ue.message }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    // ── 15. Vision prompt ──
    let prompt: string
    if (!hasTemplates) {
      prompt =
        '這是一張考卷圖片（無範本可供比對）。\\n\\n' +
        '請完成兩件事：\\n\\n' +
        '【科目判斷】\\n' +
        '根據題型內容、排版格式、文字關鍵字來判斷科目。\\n' +
        '規則：仔細看題目文字（例如：出現計算/時鐘/圖形→數學，出現拼音/閱讀/造句→國語）\\n\\n' +
        '【OCR 讀取】\\n' +
        '從考卷中讀取以下欄位（找不到就留空，不要編造）：\\n' +
        '科目_標題區：{考卷標題區寫的科目，如國語、數學}\\n' +
        '總分_標題區：{老師手寫批改的總分，數字如95 或等第如A、B+、C-}\\n' +
        '等第_標題區：{若總分是等第制（A/B/C/D/F，可含+-），填這裡；數字分數則留空}\\n' +
        '總分_小計：{各題型得分，如「選擇題10/10, 填空題8/10」}\\n' +
        '標題_標題區：{考試名稱}\\n' +
        '類型_關鍵字：{期中考→exam, 小考→quiz, 作業→homework, 報告→project}\\n' +
        '滿分_考卷標示：{考卷上的滿分，沒寫就填100}\\n' +
        '日期_考卷標示：{考卷上的日期}\\n' +
        '評分模式_有無總分：{有數字總分或等第填 scored，完全找不到任何分數或等第填 record_only}\\n\\n' +
        '請用以下格式回覆：\\n' +
        '分類科目：{科目名稱}\\n' +
        '---OCR 欄位---\\n' +
        '(上述 OCR 欄位，一行一個)\\n' +
        '---結束---'
    } else {
      const sn = activeSubjects.map((s) => s.name).join('、')
      prompt =
        '這是一張考卷分類對照圖。每種科目佔一排（綠色標題），科目下方依評量類型排列範本考卷。\\n' +
        `已知科目：${sn}。每張考卷頂部有【第N張】標記，同類型多張垂直堆疊。\\n` +
        '最後一排（紅底）是新考卷（大圖），標示「❓待分類」。\\n\\n' +
        '請完成兩件事：\\n\\n' +
        '【科目分類】\\n' +
        '根據新考卷的題型內容、排版格式、文字關鍵字，與上方各科目的範本比對，\\n' +
        '判斷新考卷最可能屬於哪個科目。\\n' +
        '規則：\\n' +
        '- 不要用「已知科目有X種所以新的一定是第X+1種」的排除法\\n' +
        '- 仔細看題目文字來判斷（例如：出現計算/時鐘/圖形→數學，出現拼音/閱讀/造句→國語）\\n\\n' +
        '【OCR 讀取】\\n' +
        '從新考卷大圖中讀取以下欄位（找不到就留空，不要編造）：\\n' +
        '科目_標題區：{考卷標題區寫的科目，如國語、數學}\\n' +
        '總分_標題區：{老師手寫批改的總分，數字如95 或等第如A、B+、C-。圈起來的或「總分」旁的}\\n' +
        '等第_標題區：{若總分是等第制（A/B/C/D/F，可含+-），填這裡；數字分數則留空}\\n' +
        '總分_小計：{各題型得分，如「選擇題10/10, 填空題8/10」}\\n' +
        '標題_標題區：{考試名稱，如第二次期中考、第5課小考}\\n' +
        '類型_關鍵字：{期中考→exam, 小考→quiz, 作業→homework, 報告→project}\\n' +
        '滿分_考卷標示：{考卷上的滿分，如120。沒寫就填100}\\n' +
        '日期_考卷標示：{考卷上的日期}\\n' +
        '評分模式_有無總分：{有數字總分或等第填 scored，完全找不到任何分數或等第填 record_only}\\n\\n' +
        '請用以下格式回覆：\\n' +
        '分類科目：{科目名稱}\\n' +
        '---OCR 欄位---\\n' +
        '(上述 OCR 欄位，一行一個)\\n' +
        '---結束---'
    }

    return NextResponse.json({
      success: true,
      stitched_image_url: urlData?.publicUrl || '',
      vision_prompt: prompt,
      reference_papers: selected.map((p) => ({
        subject_name: p.subject_name,
        assessment_type: p.assessment_type,
        title: p.title,
      })),
      new_paper_index: newIndex,
      total_papers: selected.length + 1,
    })
  } catch (error) {
    console.error('Classify context error:', error)
    return NextResponse.json(
      { error: 'Failed: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 },
    )
  }
}
