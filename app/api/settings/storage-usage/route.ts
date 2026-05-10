import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

interface UsageSummary {
  totalBytes: number
  totalFiles: number
  buckets: Array<{
    bucketId: string
    bytes: number
    files: number
    error?: string
  }>
}

function toFileSize(metadata: any) {
  const size = metadata?.size
  return typeof size === 'number' && Number.isFinite(size) ? size : 0
}

async function scanPrefix(
  supabase: ReturnType<typeof createAdminClient>,
  bucketId: string,
  prefix: string
): Promise<{ bytes: number; files: number }> {
  let offset = 0
  const limit = 100
  let bytes = 0
  let files = 0

  while (true) {
    const { data, error } = await supabase.storage.from(bucketId).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(error.message)
    }

    const items = data || []
    if (items.length === 0) {
      break
    }

    for (const item of items) {
      if (item.id === null) {
        const nestedPrefix = prefix ? `${prefix}/${item.name}` : item.name
        const nested = await scanPrefix(supabase, bucketId, nestedPrefix)
        bytes += nested.bytes
        files += nested.files
      } else {
        files += 1
        bytes += toFileSize(item.metadata)
      }
    }

    if (items.length < limit) {
      break
    }
    offset += limit
  }

  return { bytes, files }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const summary: UsageSummary = {
      totalBytes: 0,
      totalFiles: 0,
      buckets: [],
    }

    for (const bucket of buckets || []) {
      try {
        const usage = await scanPrefix(supabase, bucket.id, '')
        summary.buckets.push({
          bucketId: bucket.id,
          bytes: usage.bytes,
          files: usage.files,
        })
        summary.totalBytes += usage.bytes
        summary.totalFiles += usage.files
      } catch (bucketError) {
        summary.buckets.push({
          bucketId: bucket.id,
          bytes: 0,
          files: 0,
          error: bucketError instanceof Error ? bucketError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch storage usage' },
      { status: 500 }
    )
  }
}

