import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'goal-images'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path } = body

    if (!path) {
      return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Assessment image delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete image: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Assessment delete image error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete image: ' + (err as Error).message },
      { status: 500 }
    )
  }
}
