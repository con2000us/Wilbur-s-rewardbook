import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBackupData } from '../_shared'
import JSZip from 'jszip'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const STORAGE_ROOT = '/opt/supabase-docker/supabase/docker/volumes/storage/stub/stub'

interface XattrEntry {
  path: string // logical path in ZIP: storage/{bucket}/{logical-path}
  attrs: Record<string, string>
}

/** 遞迴走訪檔案系統，收集檔案 + xattrs */
function walkFsStorage(): Array<{
  bucket: string
  logicalPath: string
  fsPath: string  // actual file on disk (UUID file inside directory)
}> {
  const result: Array<{ bucket: string; logicalPath: string; fsPath: string }> = []

  const bucketDirs = fs.readdirSync(STORAGE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const bucket of bucketDirs) {
    const bucketPath = path.join(STORAGE_ROOT, bucket)
    walkDir(bucketPath, bucket, '', result)
  }

  return result
}

function walkDir(
  dirPath: string,
  bucket: string,
  prefix: string,
  result: Array<{ bucket: string; logicalPath: string; fsPath: string }>
) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      // Check if this directory contains a single file (UUID object)
      const subEntries = fs.readdirSync(fullPath, { withFileTypes: true })
      const files = subEntries.filter(e => e.isFile())
      if (files.length === 1) {
        // This dir IS the object: {logical-path}/{uuid}
        result.push({
          bucket,
          logicalPath,
          fsPath: path.join(fullPath, files[0].name),
        })
      } else {
        // Nested directory structure — recurse
        walkDir(fullPath, bucket, logicalPath, result)
      }
    }
  }
}

/** 讀取檔案的 extended attributes */
function getXattrs(fsPath: string): Record<string, string> {
  try {
    const output = execSync(`getfattr -d --absolute-names "${fsPath}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const attrs: Record<string, string> = {}
    for (const line of output.split('\n')) {
      const match = line.match(/^user\.([^=]+)="(.+)"$/)
      if (match) {
        attrs[`user.${match[1]}`] = match[2]
      }
    }
    return attrs
  } catch {
    return {}
  }
}

/**
 * GET /api/backup/full-export
 * 匯出完整備份：DB（JSON）+ 所有 Storage Bucket 檔案 + xattrs 清單，封裝為 ZIP。
 * Storage 檔案直接讀取檔案系統以保留 extended attributes（supabase.cache-control、content-type）。
 */
export async function GET() {
  try {
    // ── 1. 匯出資料庫 ──
    const supabase = createClient()
    const backupData = await createBackupData(supabase)

    // ── 2. 匯出 Storage（檔案系統） ──
    const fsFiles = walkFsStorage()

    // ── 3. 建立 ZIP ──
    const zip = new JSZip()
    const xattrs: XattrEntry[] = []

    // 放入 database.json
    zip.file('database.json', JSON.stringify(backupData, null, 2))

    // 放入所有 storage 檔案
    for (const file of fsFiles) {
      const zipPath = `storage/${file.bucket}/${file.logicalPath}`
      const content = fs.readFileSync(file.fsPath)
      zip.file(zipPath, content)

      // 讀取 xattrs
      const attrs = getXattrs(file.fsPath)
      if (Object.keys(attrs).length > 0) {
        xattrs.push({ path: zipPath, attrs })
      }
    }

    // 放入 xattrs 清單
    if (xattrs.length > 0) {
      zip.file('xattrs.json', JSON.stringify(xattrs, null, 2))
    }

    // 放入 metadata
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          exported_at: backupData.exported_at,
          version: '2.0',
          type: 'full',
          storage_files_count: fsFiles.length,
          storage_buckets: [...new Set(fsFiles.map(f => f.bucket))],
          xattrs_preserved: xattrs.length > 0,
        },
        null,
        2
      )
    )

    // 生成 ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    // ── 4. 回傳 ZIP ──
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup-full-${dateStr}.zip`

    // @ts-ignore - Buffer is valid BodyInit at runtime
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
