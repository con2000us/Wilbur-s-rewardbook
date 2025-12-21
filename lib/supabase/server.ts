// Supabase Server Client for Server Components
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClient() {
  // 使用簡單的客戶端，不處理複雜的 cookie
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  ) as any
}
