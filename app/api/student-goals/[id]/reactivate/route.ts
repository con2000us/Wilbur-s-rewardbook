import { NextRequest } from 'next/server'
import { POST as resetGoal } from '../reset/route'

/**
 * Deprecated compatibility endpoint.
 *
 * Older UI code used "reactivate" to mean resetting a completed goal and
 * restarting progress from today. Keep the route alive, but delegate to the
 * safer reset implementation so cleanup behavior stays consistent.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => ({}))
  const resetRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracking_started_at_mode: 'today',
      ...body,
    }),
  })

  return resetGoal(resetRequest, context)
}
