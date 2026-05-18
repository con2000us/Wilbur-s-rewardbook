import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const { path } = body

    if (!path) {
      return NextResponse.json({ success: false, error: 'Missing image path' }, { status: 400 })
    }

    const { error } = await adminClient.storage
      .from('goal-images')
      .remove([path])

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to delete image: ' + (err as Error).message,
    }, { status: 500 })
  }
}
