import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { createBackupData } from '../_shared'
import JSZip from 'jszip'

/**
 * GET /api/backup/full-export
 * 匯出完整備份：DB（JSON）+ 所有 Storage Bucket 圖片，封裝為一個 ZIP 下載。
 */
export async function GET() {
  try {
    // ── 1. 匯出資料庫 ──
    const supabase = createClient()
    const backupData = await createBackupData(supabase)

    // ── 2. 匯出 Storage ──
    const adminClient = createAdminClient()
    const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()

    if (bucketError) {
      console.error('Failed to list buckets:', bucketError)
    }

    // 收集所有檔案 binary + 路徑
    const storageFiles: Array<{ path: string; data: Blob }> = []

    for (const bucket of buckets || []) {
      try {
        const allFiles = await listAllFiles(adminClient, bucket.id, '')
        for (const filePath of allFiles) {
          try {
            const { data: blob, error: dlError } = await adminClient.storage
              .from(bucket.id)
              .download(filePath)

            if (!dlError && blob) {
              storageFiles.push({
                path: `storage/${bucket.id}/${filePath}`,
                data: blob,
              })
            } else if (dlError) {
              console.warn(`Failed to download ${bucket.id}/${filePath}:`, dlError.message)
            }
          } catch (err) {
            console.warn(`Error downloading ${bucket.id}/${filePath}:`, err)
          }
        }
      } catch (err) {
        console.warn(`Error listing bucket ${bucket.id}:`, err)
      }
    }

    // ── 3. 建立 ZIP ──
    const zip = new JSZip()

    // 放入 database.json
    zip.file('database.json', JSON.stringify(backupData, null, 2))

    // 放入 metadata
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          exported_at: backupData.exported_at,
          version: '2.0',
          type: 'full',
          storage_files_count: storageFiles.length,
          storage_buckets: (buckets || []).map((b) => b.id),
        },
        null,
        2
      )
    )

    // 放入所有 storage 檔案
    for (const file of storageFiles) {
      const arrayBuffer = await file.data.arrayBuffer()
      zip.file(file.path, arrayBuffer)
    }

    // 生成 ZIP (nodebuffer 在 Next.js server 端可直接使用)
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    // ── 4. 回傳 ZIP ──
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup-full-${dateStr}.zip`

    // @ts-ignore - Buffer is valid BodyInit at runtime; Next.js 16 TS types are overly strict
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Full export error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create full backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * 遞迴列出 bucket 中所有檔案的路徑（含子資料夾）
 */
async function listAllFiles(
  adminClient: ReturnType<typeof createAdminClient>,
  bucketId: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await adminClient.storage.from(bucketId).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(`Failed to list bucket ${bucketId}/${prefix}: ${error.message}`)
    }

    const items = data || []
    if (items.length === 0) break

    for (const item of items) {
      if (item.id === null) {
        // 子目錄 → 遞迴
        const nestedPrefix = prefix ? `${prefix}/${item.name}` : item.name
        const nestedPaths = await listAllFiles(adminClient, bucketId, nestedPrefix)
        paths.push(...nestedPaths)
      } else {
        // 檔案
        const filePath = prefix ? `${prefix}/${item.name}` : item.name
        paths.push(filePath)
      }
    }

    if (items.length < limit) break
    offset += limit
  }

  return paths
}
