/**
 * GET /api/ai-assessment/status
 *
 * Returns AI assessment feature availability,
 * including daily/monthly remaining quota.
 */

import { NextResponse } from 'next/server'
import { getAiFeatureStatus } from '@/lib/ai/config'

export async function GET() {
  try {
    const status = await getAiFeatureStatus()
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      {
        enabled: false,
        processingMode: 'multimodal',
        visionConfigured: false,
        textConfigured: false,
        dailyRemaining: 0,
        monthlyRemaining: 0,
        reason: 'Failed to check status',
      },
      { status: 500 }
    )
  }
}
